port module ShowList.State exposing (init, update, subscriptions)

import Http
import GlobalPorts exposing (showNotification)
import ShowList.Types exposing (Model, Msg(..), ShowRev, ShowModel, Show, ShowRemoval)
import Date.Extra.Format as Format exposing (utcIsoString)
import Task
import Dict
import Date exposing (Date)
import Api.Api as Api
import List.Extra exposing (groupWhile)
import Api.Types exposing (TVShowEpisode)
import GlobalPorts exposing (showNotification)


init showOnlyShowsWithUnwatched =
    ( { list = [], error = Nothing, showOnlyShowsWithUnwatched = showOnlyShowsWithUnwatched, today = Date.fromTime 0 }, Task.perform ShowTimeError SetTodaysDate Date.now )


showInit =
    { seasonsListVisible = False
    , visibleSeasons = Dict.empty
    , show =
        { id = 0
        , name = ""
        , lastEpisodeWatched = ( 0, 0 )
        , image = Nothing
        , seasons = []
        , rev = ""
        , added = Date.fromTime 0 |> utcIsoString
        }
    }


port loadShows : (List ShowList.Types.Show -> msg) -> Sub msg


port loadRev : (ShowRev -> msg) -> Sub msg


port removeShow : ShowList.Types.ShowRemoval -> Cmd msg


port persistShow : Show -> Cmd msg


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ loadShows LoadShows
        , loadRev SetRev
        ]


fetchShow id =
    (Api.getEpisodes id)


getSeason episodes =
    case episodes of
        [] ->
            0

        first :: _ ->
            first.season


addEpisodesToShows shows episodesForShows =
    let
        showEpisodes =
            Dict.fromList episodesForShows
    in
        List.map
            (\show -> { show | episodes = Maybe.withDefault [] (Dict.get show.id showEpisodes) })
            shows


updateShowInList : List ShowModel -> Int -> (ShowModel -> ShowModel) -> (ShowModel -> Cmd a) -> ( List ShowModel, Cmd a )
updateShowInList shows id updateShow getCmd =
    let
        chooseUpdater showModel =
            if showModel.show.id == id then
                (updateShow showModel)
            else
                showModel

        updatedList =
            List.map chooseUpdater shows

        updatedShow =
            List.Extra.find (\showModel -> showModel.show.id == id) updatedList

        cmd =
            case updatedShow of
                Nothing ->
                    Cmd.none

                Just show ->
                    getCmd show
    in
        ( updatedList, cmd )


updateShowData update showModel =
    { showModel | show = (update showModel.show) }


update : ShowList.Types.Msg -> Model -> ( Model, Cmd ShowList.Types.Msg )
update msg model =
    case msg of
        SetTodaysDate date ->
            ( { model | today = date }, Cmd.none )

        RemoveShow removal ->
            let
                listWithoutShow =
                    List.filter (\show -> removal.id /= show.show.id) model.list
            in
                ( { model | list = listWithoutShow }, Cmd.batch [ removeShow removal, showNotification ("Removed " ++ removal.name) ] )

        ShowError error ->
            case error of
                Http.UnexpectedPayload err ->
                    ( { model | error = Just err }, Cmd.none )

                _ ->
                    ( { model | error = Just "Sorry, something went wrong during your search. You might be offline." }, Cmd.none )

        ShowTimeError error ->
            ( { model | error = Just error }, Cmd.none )

        AddToList ( today, result ) ->
            let
                getImage show =
                    case show.image of
                        Nothing ->
                            Nothing

                        Just image ->
                            Just image.medium

                defaultShow =
                    showInit.show

                updatedShow =
                    { defaultShow | id = result.show.id, name = result.show.name, image = (getImage result.show), added = utcIsoString today }

                newShow =
                    { showInit | show = updatedShow }
            in
                ( { model | list = newShow :: model.list }
                , Cmd.batch
                    [ Task.perform ShowError (UpdateEpisodes updatedShow.id) (fetchShow updatedShow.id)
                    , showNotification ("Added " ++ updatedShow.name)
                    ]
                )

        LoadShows shows ->
            let
                newShows =
                    List.map (\show -> { showInit | show = show }) shows

                cmds =
                    List.map (\show -> Task.perform ShowError (UpdateEpisodes show.id) (fetchShow show.id)) shows
            in
                ( { model | list = newShows }, Cmd.batch cmds )

        ToggleShowUnwatchedOnly showUnwatched ->
            ( { model | showOnlyShowsWithUnwatched = showUnwatched }, Cmd.none )

        ToggleSeasons id isVisible ->
            let
                updater show =
                    { show | seasonsListVisible = isVisible }

                ( updatedList, cmd ) =
                    updateShowInList model.list id updater (\_ -> Cmd.none)
            in
                ( { model | list = updatedList }, cmd )

        ToggleSeason id number isVisible ->
            let
                updater show =
                    let
                        updatedVisible =
                            Dict.insert number isVisible show.visibleSeasons
                    in
                        { show | visibleSeasons = updatedVisible }

                ( updatedList, cmd ) =
                    updateShowInList model.list id updater (\_ -> Cmd.none)
            in
                ( { model | list = updatedList }, cmd )

        MarkEpisodeWatched id last ->
            let
                updater =
                    updateShowData
                        (\show -> { show | lastEpisodeWatched = last })

                getPersistCmd updatedShow =
                    persistShow updatedShow.show

                ( updatedList, cmd ) =
                    updateShowInList model.list id updater getPersistCmd
            in
                ( { model | list = updatedList }, cmd )

        MarkSeasonWatched id number ->
            let
                updateShow show =
                    let
                        chosenSeason =
                            List.Extra.find (\season -> season.number == number) show.seasons
                    in
                        case chosenSeason of
                            Nothing ->
                                show

                            Just season ->
                                case season.episodes of
                                    [] ->
                                        show

                                    latest :: _ ->
                                        { show | lastEpisodeWatched = ( number, latest.number ) }

                getPersistCmd updatedShow =
                    persistShow updatedShow.show

                ( updatedList, cmd ) =
                    updateShowInList model.list id (updateShowData updateShow) getPersistCmd
            in
                ( { model | list = updatedList }, cmd )

        MarkAllEpisodesWatched id ->
            let
                updateShow show =
                    let
                        latestEpisode =
                            case show.seasons of
                                [] ->
                                    ( 0, 0 )

                                season :: _ ->
                                    case season.episodes of
                                        [] ->
                                            ( 0, 0 )

                                        episode :: _ ->
                                            ( season.number, episode.number )
                    in
                        { show | lastEpisodeWatched = latestEpisode }

                getPersistCmd updatedShow =
                    Cmd.batch
                        [ persistShow updatedShow.show
                        , showNotification ("Caught up on " ++ updatedShow.show.name)
                        ]

                ( updatedList, cmd ) =
                    updateShowInList model.list id (updateShowData updateShow) getPersistCmd
            in
                ( { model | list = updatedList }, cmd )

        UpdateEpisodes id episodes ->
            let
                updateShow show =
                    let
                        seasons =
                            List.reverse episodes
                                |> List.map
                                    (\episode ->
                                        { id = episode.id
                                        , name = episode.name
                                        , summary = episode.summary
                                        , season = episode.season
                                        , number = episode.number
                                        , airstamp = episode.airstamp
                                        }
                                    )
                                |> groupWhile (\cur next -> cur.season == next.season)
                                |> List.map
                                    (\episodes ->
                                        { episodes = episodes
                                        , number = (getSeason episodes)
                                        }
                                    )
                    in
                        { show | seasons = seasons }

                getPersistCmd updatedShow =
                    persistShow updatedShow.show

                ( updatedList, cmd ) =
                    updateShowInList model.list id (updateShowData updateShow) getPersistCmd

                _ =
                    Debug.log "Episodes" updatedList
            in
                ( { model | list = updatedList }, cmd )

        UpdateShow id ->
            ( model, Task.perform ShowError (UpdateEpisodes id) (fetchShow id) )

        SetRev showRev ->
            let
                updater show =
                    { show | rev = showRev.rev }

                ( updatedList, cmd ) =
                    updateShowInList model.list showRev.id (updateShowData updater) (\_ -> Cmd.none)
            in
                ( { model | list = updatedList }, cmd )
