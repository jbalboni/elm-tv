port module Show exposing (Model, model, view, update, Msg(UpdateShow, ShowError))

import Html exposing (Html, button, div, text, img, a, hr)
import Html.Attributes exposing (class, style, src, href)
import Html.Events exposing (onClick)
import Dict
import Api
import Http
import Task
import Api
import List.Extra exposing (groupWhile)
import Markdown
import TVShowEpisode exposing (TVShowEpisode)


-- MODEL


type alias Episode =
    { id : Int, name : String, summary : String, season : Int, number : Int }


type alias Season =
    { number : Int, episodes : List Episode, visible : Bool }


type alias Model =
    { id : Int, lastEpisodeWatched : Int, name : String, image : Maybe String, seasons : List Season, seasonsVisible : Bool }


model =
    { id = 0, name = "", lastEpisodeWatched = 0, image = Nothing, seasons = [], seasonsVisible = False }



-- UPDATE


port saveShow : Model -> Cmd msg


port updateShow : Model -> Cmd msg


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
    | MarkEpisodeWatched Episode
    | ToggleSeasons Bool
    | UpdateShow
    | UpdateEpisodes (List TVShowEpisode)
    | ShowError Http.Error


getSeason episodes =
    case episodes of
        [] ->
            0

        first :: _ ->
            first.season


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
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
                ( updatedShow, (updateShow updatedShow) )

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
                                }
                            )
                        |> groupWhile (\cur next -> cur.season == next.season)
                        |> List.map
                            (\episodes ->
                                { visible = False
                                , episodes = episodes
                                , number = (getSeason episodes)
                                }
                            )

                updatedShow =
                    { model | seasons = seasons }
            in
                ( updatedShow
                , (if updatedShow /= model then
                    saveShow updatedShow
                   else
                    Cmd.none
                  )
                )

        UpdateShow ->
            ( model, Task.perform ShowError UpdateEpisodes (fetchShow model) )

        ToggleSeasons isVisible ->
            ( { model | seasonsVisible = isVisible }, Cmd.none )

        ToggleSeason number isVisible ->
            let
                newSeasons =
                    List.map
                        (\season ->
                            (if season.number == number then
                                { season | visible = isVisible }
                             else
                                season
                            )
                        )
                        model.seasons
            in
                ( { model | seasons = newSeasons }, Cmd.none )

        ShowError _ ->
            ( model, Cmd.none )

        _ ->
            ( model, Cmd.none )



-- VIEW


viewEpisode episode =
    div []
        [ div [ class "mui--text-subhead" ]
            [ text ("Episode " ++ (toString episode.number) ++ " - " ++ episode.name) ]
        , div [ style [ ( "padding-left", "15px" ) ] ]
            [ (Markdown.toHtml [] episode.summary) ]
        ]


viewEpisodes season =
    case season.visible of
        True ->
            div [ style [ ( "padding-left", "15px" ) ] ]
                (List.intersperse (hr [] []) (List.map viewEpisode season.episodes))

        False ->
            div [] []


viewSeasons seasons =
    div []
        (List.map
            (\season ->
                div []
                    [ a [ onClick (ToggleSeason season.number (not season.visible)), href "#", class "mui--text-subhead" ]
                        [ text ("Season " ++ (toString season.number)) ]
                    , viewEpisodes season
                    ]
            )
            seasons
        )


view show =
    let
        episodes =
            List.concat (List.map (\season -> season.episodes) show.seasons)

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
                [ img [ style [ ( "height", "100px" ) ], src (Maybe.withDefault "http://lorempixel.com/72/100/abstract" show.image) ]
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
                    , (if unwatchedEpisodes /= 0 then
                        button [ class "mui-btn mui-btn--primary mui-btn--small", onClick MarkAllEpisodesWatched ]
                            [ text "I'm caught up" ]
                       else
                        div [] []
                      )
                    , button [ onClick (ToggleSeasons (not show.seasonsVisible)), class "mui-btn mui-btn--accent mui-btn--small" ]
                        [ text
                            (if show.seasonsVisible then
                                "Hide seasons"
                             else
                                "Show seasons"
                            )
                        ]
                    , (if show.seasonsVisible == True then
                        viewSeasons show.seasons
                       else
                        div [] []
                      )
                    ]
                ]
            ]
