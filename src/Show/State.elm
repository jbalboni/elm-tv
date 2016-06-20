port module Show.State exposing (init, update)

import Http
import Task
import Dict
import Date exposing (Date)
import Date.Extra.Format as Format exposing (utcIsoString)
import Api.Api as Api
import List.Extra exposing (groupWhile)
import Api.Types exposing (TVShowEpisode)
import Show.Types exposing (Msg(..), Model, Show)
import GlobalPorts exposing (showNotification)


init : ( Model, Cmd Msg )
init =
    ( { today = Date.fromTime 0
      , seasonsListVisible = False
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
    , Task.perform ShowTimeError SetTodaysDate Date.now
    )


port persistShow : Show -> Cmd msg


fetchShow show =
    (Api.getEpisodes show.id)


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


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        SetTodaysDate date ->
            ( { model | today = date }, Cmd.none )

        ToggleSeasons isVisible ->
            ( { model | seasonsListVisible = isVisible }, Cmd.none )

        ToggleSeason number isVisible ->
            let
                updatedVisible =
                    Dict.insert number isVisible model.visibleSeasons
            in
                ( { model | visibleSeasons = updatedVisible }, Cmd.none )

        RemoveShow show ->
            ( model, Cmd.none )

        _ ->
            let
                ( show, cmd ) =
                    updateShow msg model.show
            in
                ( { model | show = show }, cmd )


updateShow : Msg -> Show -> ( Show, Cmd Msg )
updateShow msg model =
    case msg of
        MarkEpisodeWatched last ->
            let
                updatedShow =
                    { model | lastEpisodeWatched = last }
            in
                ( updatedShow, persistShow updatedShow )

        MarkSeasonWatched number ->
            let
                chosenSeason =
                    List.Extra.find (\season -> season.number == number) model.seasons
            in
                case chosenSeason of
                    Nothing ->
                        ( model, Cmd.none )

                    Just season ->
                        case season.episodes of
                            [] ->
                                ( model, Cmd.none )

                            latest :: _ ->
                                let
                                    updatedShow =
                                        { model | lastEpisodeWatched = ( number, latest.number ) }
                                in
                                    ( updatedShow, persistShow updatedShow )

        MarkAllEpisodesWatched ->
            let
                latestEpisode =
                    case model.seasons of
                        [] ->
                            ( 0, 0 )

                        season :: _ ->
                            case season.episodes of
                                [] ->
                                    ( 0, 0 )

                                episode :: _ ->
                                    ( season.number, episode.number )

                updatedShow =
                    { model | lastEpisodeWatched = latestEpisode }
            in
                ( updatedShow
                , Cmd.batch
                    [ persistShow updatedShow
                    , showNotification ("Caught up on " ++ model.name)
                    ]
                )

        UpdateEpisodes episodes ->
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

                updatedShow =
                    { model | seasons = seasons }
            in
                ( updatedShow
                , (if updatedShow /= model then
                    persistShow updatedShow
                   else
                    Cmd.none
                  )
                )

        UpdateShow ->
            ( model, Task.perform ShowError UpdateEpisodes (fetchShow model) )

        SetRev rev ->
            ( { model | rev = rev }, Cmd.none )

        _ ->
            ( model, Cmd.none )
