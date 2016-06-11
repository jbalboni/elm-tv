port module Show.Show exposing (Model, Show, model, view, update, Msg(UpdateShow, ShowError, SetRev))

import Html exposing (Html, button, div, text, img, a, hr)
import Html.Attributes exposing (class, style, src, href)
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
import Debug
import Date.Extra.Config.Config_en_au exposing (config)
import Date.Extra.Format as Format exposing (format, formatUtc, isoMsecOffsetFormat)
import Html.CssHelpers
import Show.Styles exposing (CssClasses(..), componentNamespace)


namespace =
    Html.CssHelpers.withNamespace componentNamespace


localClass =
    namespace.class



-- MODEL


type alias Episode =
    { id : Int, name : String, summary : String, season : Int, number : Int, airstamp : String }


type alias Season =
    { number : Int, episodes : List Episode }


type alias Show =
    { id : Int, lastEpisodeWatched : Int, name : String, image : Maybe String, seasons : List Season, rev : String }


type alias Model =
    { today : Date, show : Show, seasonsListVisible : Bool, visibleSeasons : Dict.Dict Int Bool }


model =
    ( { today = Date.fromTime 0
      , seasonsListVisible = False
      , visibleSeasons = Dict.empty
      , show =
            { id = 0
            , name = ""
            , lastEpisodeWatched = 0
            , image = Nothing
            , seasons = []
            , rev = ""
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


type Msg
    = ToggleSeason Int Bool
    | MarkAllEpisodesWatched
    | MarkSeasonWatched Int
    | MarkEpisodeWatched Int
    | ToggleSeasons Bool
    | UpdateShow
    | UpdateEpisodes (List TVShowEpisode)
    | ShowError Http.Error
    | ShowTimeError String
    | SetTodaysDate Date
    | SetRev String


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

        _ ->
            let
                ( show, cmd ) =
                    updateShow msg model.show
            in
                ( { model | show = show }, cmd )


updateShow : Msg -> Show -> ( Show, Cmd Msg )
updateShow msg model =
    case msg of
        MarkEpisodeWatched id ->
            let
                updatedShow =
                    { model | lastEpisodeWatched = id }
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
                                        { model | lastEpisodeWatched = latest.id }
                                in
                                    ( updatedShow, persistShow updatedShow )

        MarkAllEpisodesWatched ->
            let
                latestEpisode =
                    case model.seasons of
                        [] ->
                            0

                        season :: _ ->
                            case season.episodes of
                                [] ->
                                    0

                                episode :: _ ->
                                    episode.id

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


hasSeasonBeenWatched lastWatchedEpisode season =
    case season.episodes of
        [] ->
            False

        latest :: _ ->
            lastWatchedEpisode >= latest.id


viewEpisode lastEpisodeWatched episode =
    div []
        [ div [ class "mui--text-subhead" ]
            [ text ("Episode " ++ (toString episode.number) ++ " - " ++ episode.name) ]
        , div []
            [ (Markdown.toHtml [] episode.summary) ]
        , (if episode.id > lastEpisodeWatched then
            div [ style [ ( "display", "flex" ), ( "justify-content", "flex-end" ) ] ]
                [ button [ onClick (MarkEpisodeWatched episode.id), class "mui-btn mui-btn--primary mui-btn--small c-show-Button" ]
                    [ text "I watched this" ]
                ]
           else
            div [] []
          )
        ]


viewEpisodes lastEpisodeWatched isVisible season =
    case isVisible of
        True ->
            div []
                ((List.intersperse (hr [] []) (List.map (viewEpisode lastEpisodeWatched) season.episodes)) ++ [ (hr [] []) ])

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
                [ div [ class "mui--text-title", style [ ( "line-height", "43px" ), ( "width", "50%" ) ] ]
                    [ text ("Season " ++ (toString season.number)) ]
                , div []
                    [ div []
                        [ (if (hasSeasonBeenWatched lastEpisodeWatched season) == True then
                            div [] []
                           else
                            (button [ onClick (MarkSeasonWatched season.number), class "mui-btn mui-btn--primary mui-btn--small c-show-Button" ]
                                [ text "I watched this" ]
                            )
                          )
                        ]
                    , div [ style [ ( "text-align", "right" ) ] ]
                        [ button [ onClick (ToggleSeason season.number (not isVisible)), class "mui-btn mui-btn--accent mui-btn--small c-show-Button" ]
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
            , hr [] []
            , viewEpisodes lastEpisodeWatched isVisible season
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
view {today, show, visibleSeasons, seasonsListVisible} =
    let
        seasons =
            airedSeasons today show.seasons

        episodes =
            List.concat (List.map (\season -> season.episodes) seasons)

        numEpisodes =
            List.length episodes

        unwatchedEpisodes =
            case show.lastEpisodeWatched of
                0 ->
                    numEpisodes

                _ ->
                    List.length (List.filter (\episode -> episode.id > show.lastEpisodeWatched) episodes)

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
            [ div [ style [ ( "display", "flex" ), ( "overflow", "auto" ), ( "min-height", "100px" ), ( "margin-bottom", "15px" ) ] ]
                [ img [ localClass [ ShowImage ], src (Maybe.withDefault "http://lorempixel.com/72/100/abstract" show.image) ]
                    []
                , div [ style [ ( "padding-left", "15px" ), ( "flex", "1" ) ] ]
                    [ div [ class "mui--text-title" ]
                        [ text show.name ]
                    , div [ class "mui--text-subhead" ]
                        [ text
                            (if (numEpisodes > 0) then
                                unwatchedEpisodesDesc
                             else
                                ""
                            )
                        ]
                    ]
                ]
            , button [ onClick (ToggleSeasons (not seasonsListVisible)), class "mui-btn mui-btn--accent mui-btn--small c-show-Button" ]
                [ text
                    (if seasonsListVisible then
                        "Hide seasons"
                     else
                        "Show seasons"
                    )
                ]
            , (if unwatchedEpisodes /= 0 then
                button [ class "mui-btn mui-btn--primary mui-btn--small c-show-Button", onClick MarkAllEpisodesWatched ]
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
