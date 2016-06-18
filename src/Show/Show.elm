port module Show.Show exposing (Model, Show, model, view, update, Msg(UpdateShow, ShowError, SetRev, RemoveShow), ShowRemoval)

import Html exposing (Html, button, div, text, img, a, hr, span)
import Html.Attributes exposing (class, style, src, href, disabled)
import Html.Events exposing (onClick)
import Dict
import Http
import Task
import Api.Api as Api
import List.Extra exposing (groupWhile)
import Markdown
import Api.Types exposing (TVShowEpisode)
import Date exposing (Date)
import Date.Extra.Compare as Compare exposing (is, Compare2(..))
import Date.Extra.Config.Config_en_au exposing (config)
import Date.Extra.Format as Format exposing (format, utcIsoString, isoMsecOffsetFormat)


-- MODEL


type alias Episode =
    { id : Int, name : String, summary : String, season : Int, number : Int, airstamp : String }


type alias Season =
    { number : Int, episodes : List Episode }


type alias Show =
    { id : Int, lastEpisodeWatched : (Int, Int), name : String, image : Maybe String, seasons : List Season, rev : String, added : String }


type alias Model =
    { today : Date, show : Show, seasonsListVisible : Bool, visibleSeasons : Dict.Dict Int Bool }

type alias ShowRemoval =
    { id : Int, rev : String }


model : (Model, Cmd Msg)
model =
    ( { today = Date.fromTime 0
      , seasonsListVisible = False
      , visibleSeasons = Dict.empty
      , show =
            { id = 0
            , name = ""
            , lastEpisodeWatched = (0, 0)
            , image = Nothing
            , seasons = []
            , rev = ""
            , added = Date.fromTime 0 |> utcIsoString
            }
      }
    , Task.perform ShowTimeError SetTodaysDate Date.now
    )



-- UPDATE


port persistShow : Show -> Cmd msg


fetchShow show =
    (Api.getEpisodes show.id)


addEpisodesToShows shows episodesForShows =
    let
        showEpisodes =
            Dict.fromList episodesForShows
    in
        List.map (\show -> { show | episodes = Maybe.withDefault [] (Dict.get show.id showEpisodes) }) shows


type Msg =
    ToggleSeason Int Bool
    | MarkAllEpisodesWatched
    | MarkSeasonWatched Int
    | MarkEpisodeWatched (Int, Int)
    | ToggleSeasons Bool
    | UpdateShow
    | UpdateEpisodes (List TVShowEpisode)
    | ShowError Http.Error
    | ShowTimeError String
    | SetTodaysDate Date
    | SetRev String
    | RemoveShow ShowRemoval


getSeason episodes =
    case episodes of
        [] ->
            0

        first :: _ ->
            first.season


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
                                        { model | lastEpisodeWatched = (number, latest.number) }
                                in
                                    ( updatedShow, persistShow updatedShow )

        MarkAllEpisodesWatched ->
            let
                latestEpisode =
                    case model.seasons of
                        [] ->
                            (0, 0)

                        season :: _ ->
                            case season.episodes of
                                [] ->
                                    (0, 0)

                                episode :: _ ->
                                    (season.number, episode.number)

                updatedShow =
                    { model | lastEpisodeWatched = latestEpisode }
            in
                ( updatedShow, persistShow updatedShow )

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



-- VIEW

episodeWatched (watchedSeason, watchedEpisode) episode =
    if episode.season < watchedSeason then
        True
    else
        if (episode.season == watchedSeason) && (episode.number <= watchedEpisode) then
            True
        else
            False

hasSeasonBeenWatched lastWatchedEpisode season =
    case season.episodes of
        [] ->
            False

        latest :: _ ->
            episodeWatched lastWatchedEpisode latest


viewEpisode lastEpisodeWatched episode =
    div []
        [ div [ class "mdl-typography--title" ]
            [ text ("Episode " ++ (toString episode.number) ++ " - " ++ episode.name) ]
        , div [ class "elmtv__episode-desc"]
            [ (Markdown.toHtml [] episode.summary) ]
        , div [ style [ ( "display", "flex" ), ( "justify-content", "flex-end" ) ] ]
            [ button [ onClick (MarkEpisodeWatched (episode.season, episode.number)), disabled (episodeWatched lastEpisodeWatched episode), class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored elmtv__button--spacing" ]
                [ text "I watched this" ]
            ]
        ]


viewEpisodes lastEpisodeWatched isVisible season =
    case isVisible of
        True ->
            div []
                (List.map (viewEpisode lastEpisodeWatched) season.episodes)

        False ->
            div [] []


viewSeason lastEpisodeWatched visibleSeasons season =
    let
        isVisible =
            case Dict.get season.number visibleSeasons of
                Nothing ->
                    False

                Just visible ->
                    visible
    in
        div []
            [ div [ style [ ( "display", "flex" ), ( "justify-content", "space-between" ), ( "flex-wrap", "wrap" ) ] ]
                [ div [ class "mdl-typography--headline", style [ ( "line-height", "43px" ), ( "width", "50%" ) ] ]
                    [ text ("Season " ++ (toString season.number)) ]
                , div []
                    [ div []
                        [ (if (hasSeasonBeenWatched lastEpisodeWatched season) == True then
                            div [] []
                           else
                            (button [ onClick (MarkSeasonWatched season.number), class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored elmtv__button--spacing" ]
                                [ text "I watched this" ]
                            )
                          )
                        ]
                    , div [ style [ ( "text-align", "right" ) ] ]
                        [ button [ onClick (ToggleSeason season.number (not isVisible)), class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent elmtv__button--spacing" ]
                            [ text
                                (if isVisible then
                                    "Hide episodes"
                                 else
                                    "Show episodes"
                                )
                            ]
                        ]
                    ]
                ]
            , viewEpisodes lastEpisodeWatched isVisible season
            , hr [] []
            ]


viewSeasons lastEpisodeWatched seasons visibleSeasons =
    div []
        ((hr [] [])
            :: (List.map (viewSeason lastEpisodeWatched visibleSeasons) seasons)
        )


episodeAired today episode =
    case Result.toMaybe (Date.fromString episode.airstamp) of
        Nothing ->
            True

        Just date ->
            is After today date


airedSeasons today seasons =
    seasons
        |> List.map (\season -> { season | episodes = (List.filter (episodeAired today) season.episodes) })
        |> List.filter (\season -> season.episodes /= [])


view : Model -> Html Msg
view { today, show, visibleSeasons, seasonsListVisible } =
    let
        seasons =
            airedSeasons today show.seasons

        episodes =
            List.concat (List.map (\season -> season.episodes) seasons)

        numEpisodes =
            List.length episodes

        unwatchedEpisodes =
            case show.lastEpisodeWatched of
                (0, 0) ->
                    numEpisodes

                _ ->
                    List.length (List.filter (\episode -> not (episodeWatched show.lastEpisodeWatched episode)) episodes)

        unwatchedEpisodesDesc =
            case unwatchedEpisodes of
                0 ->
                    "All caught up"

                1 ->
                    (toString unwatchedEpisodes) ++ " episode to watch"

                _ ->
                    (toString unwatchedEpisodes) ++ " episodes to watch"
    in
        div []
            [ button [ onClick (RemoveShow { id = show.id, rev = show.rev }),  class "mdl-button mdl-js-button mdl-button--icon mdl-button--accent elmtv__remove-show" ]
                [ span [ class "material-icons" ]
                    [ text "delete" ]
                ]
            , div [ style [ ( "display", "flex" ), ( "overflow", "visible" ), ( "min-height", "100px" ), ( "margin-bottom", "15px" ) ] ]
                [ img [ class "c-show-ShowImage", src (Maybe.withDefault "http://lorempixel.com/72/100/abstract" show.image) ]
                    []
                , div [ style [ ( "padding-left", "15px" ), ( "flex", "1" ) ] ]
                    [ div [ class "mdl-typography--headline" ]
                        [ text show.name ]
                    , div [ class "mdl-typography--title" ]
                        [ text
                            (if (numEpisodes > 0) then
                                unwatchedEpisodesDesc
                             else
                                ""
                            )
                        ]
                    ]
                ]
            , button [ onClick (ToggleSeasons (not seasonsListVisible)), class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored elmtv__button--spacing" ]
                [ text
                    (if seasonsListVisible then
                        "Hide seasons"
                     else
                        "Show seasons"
                    )
                ]
            , (if unwatchedEpisodes /= 0 then
                button [ class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent elmtv__button--spacing", onClick MarkAllEpisodesWatched ]
                    [ text "I'm caught up" ]
               else
                div [] []
              )
            , (if seasonsListVisible == True then
                viewSeasons show.lastEpisodeWatched seasons visibleSeasons
               else
                div [] []
              )
            ]
