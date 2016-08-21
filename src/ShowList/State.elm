port module ShowList.State exposing (init, update, subscriptions)

import Http
import GlobalPorts exposing (showNotification)
import ShowList.Types exposing (Model, Msg(..), ShowRev, Show, ShowData, ShowRemoval)
import Date.Extra.Format as Format exposing (utcIsoString)
import Task
import Dict
import Date exposing (Date)
import Api.Api as Api
import List.Extra exposing (groupWhile)
import Api.Types exposing (TVShowEpisode)
import GlobalPorts exposing (showNotification)
import Utils.Show exposing (getSeason)
import Maybe exposing (andThen)


init showOnlyShowsWithUnwatched =
    ( { list = []
      , error = Nothing
      , showOnlyShowsWithUnwatched = showOnlyShowsWithUnwatched
      , today = Date.fromTime 0
      }
    , Task.perform ShowTimeError SetTodaysDate Date.now
    )


showInit =
    { seasonsListVisible = False
    , visibleSeasons = Dict.empty
    , showData =
        { id = 0
        , name = ""
        , lastEpisodeWatched = ( 0, 0 )
        , image = Nothing
        , seasons = []
        , rev = ""
        , added = Date.fromTime 0 |> utcIsoString
        }
    }


port loadShows : (List ShowData -> msg) -> Sub msg


port loadRev : (ShowRev -> msg) -> Sub msg


port removeShow : ShowRemoval -> Cmd msg


port persistShow : ShowData -> Cmd msg


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ loadShows LoadShows
        , loadRev SetRev
        ]


fetchShow id =
    (Api.getEpisodes id)


updateShowInList : List Show -> Int -> (Show -> Show) -> (Show -> Cmd a) -> ( List Show, Cmd a )
updateShowInList shows id updateShow getCmd =
    let
        updateOrPassThrough show =
            if show.showData.id == id then
                (updateShow show)
            else
                show

        updatedList =
            List.map updateOrPassThrough shows

        updatedShow =
            List.Extra.find (\show -> show.showData.id == id) updatedList

        cmd =
            updatedShow
                `andThen` (\show -> Just (getCmd show))
                |> Maybe.withDefault Cmd.none
    in
        ( updatedList, cmd )


updateShowData : (ShowData -> ShowData) -> Show -> Show
updateShowData update show =
    { show | showData = (update show.showData) }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        SetTodaysDate date ->
            ( { model | today = date }, Cmd.none )

        RemoveShow removal ->
            let
                listWithoutShow =
                    List.filter (\show -> removal.id /= show.showData.id) model.list
            in
                ( { model | list = listWithoutShow }, Cmd.batch [ removeShow removal, showNotification ("Removed " ++ removal.name) ] )

        ShowError error ->
            case error of
                Http.UnexpectedPayload err ->
                    ( { model | error = Just err }, Cmd.none )

                _ ->
                    ( { model | error = Just "Sorry, something went wrong. You might be offline." }, Cmd.none )

        ShowTimeError error ->
            ( { model | error = Just error }, Cmd.none )

        AddToList ( today, result ) ->
            let
                getImage showData =
                    case showData.image of
                        Nothing ->
                            Nothing

                        Just image ->
                            Just image.medium

                defaultShow =
                    showInit.showData

                updatedShowData =
                    { defaultShow | id = result.show.id, name = result.show.name, image = (getImage result.show), added = utcIsoString today }

                newShow =
                    { showInit | showData = updatedShowData }
            in
                ( { model | list = (newShow :: model.list) }
                , Cmd.batch
                    [ Task.perform ShowError (UpdateEpisodes updatedShowData.id) (fetchShow updatedShowData.id)
                    , showNotification ("Added " ++ updatedShowData.name)
                    ]
                )

        LoadShows shows ->
            let
                newShows =
                    List.map (\showData -> { showInit | showData = showData }) shows

                cmds =
                    List.map (\showData -> Task.perform ShowError (UpdateEpisodes showData.id) (fetchShow showData.id)) shows
            in
                ( { model | list = newShows }, Cmd.batch cmds )

        ToggleShowUnwatchedOnly showUnwatched ->
            ( { model | showOnlyShowsWithUnwatched = showUnwatched }, Cmd.none )

        ToggleSeasons id isVisible ->
            let
                updateShow show =
                    { show | seasonsListVisible = isVisible }

                ( updatedList, cmd ) =
                    updateShowInList model.list id updateShow (\_ -> Cmd.none)
            in
                ( { model | list = updatedList }, cmd )

        ToggleSeason id number isVisible ->
            let
                updateShow show =
                    let
                        updatedVisible =
                            Dict.insert number isVisible show.visibleSeasons
                    in
                        { show | visibleSeasons = updatedVisible }

                ( updatedList, cmd ) =
                    updateShowInList model.list id updateShow (\_ -> Cmd.none)
            in
                ( { model | list = updatedList }, cmd )

        MarkEpisodeWatched id last ->
            let
                updateShow showData =
                    { showData | lastEpisodeWatched = last }

                getPersistCmd updatedShow =
                    persistShow updatedShow.showData

                ( updatedList, cmd ) =
                    updateShowInList model.list id (updateShowData updateShow) getPersistCmd
            in
                ( { model | list = updatedList }, cmd )

        MarkSeasonWatched id number ->
            let
                updateShow showData =
                    let
                        chosenSeason =
                            List.Extra.find (\season -> season.number == number) showData.seasons
                    in
                        case chosenSeason of
                            Nothing ->
                                showData

                            Just season ->
                                case season.episodes of
                                    [] ->
                                        showData

                                    latest :: _ ->
                                        { showData | lastEpisodeWatched = ( number, latest.number ) }

                getPersistCmd updatedShow =
                    persistShow updatedShow.showData

                ( updatedList, cmd ) =
                    updateShowInList model.list id (updateShowData updateShow) getPersistCmd
            in
                ( { model | list = updatedList }, cmd )

        MarkAllEpisodesWatched id ->
            let
                updateShow showData =
                    let
                        latestEpisode =
                            case showData.seasons of
                                [] ->
                                    ( 0, 0 )

                                season :: _ ->
                                    case season.episodes of
                                        [] ->
                                            ( 0, 0 )

                                        episode :: _ ->
                                            ( season.number, episode.number )
                    in
                        { showData | lastEpisodeWatched = latestEpisode }

                getPersistCmd updatedShow =
                    Cmd.batch
                        [ persistShow updatedShow.showData
                        , showNotification ("Caught up on " ++ updatedShow.showData.name)
                        ]

                ( updatedList, cmd ) =
                    updateShowInList model.list id (updateShowData updateShow) getPersistCmd
            in
                ( { model | list = updatedList }, cmd )

        UpdateEpisodes id episodes ->
            let
                updateShow showData =
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
                        { showData | seasons = seasons }

                getPersistCmd updatedShow =
                    persistShow updatedShow.showData

                ( updatedList, cmd ) =
                    updateShowInList model.list id (updateShowData updateShow) getPersistCmd
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
