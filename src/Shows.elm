port module Shows exposing (Model, Msg(AddToList), model, view, update, subscriptions)

import Html exposing (Html, button, div, text, input, label, span, img, hr)
import Html.Attributes exposing (type', class, placeholder, style, src)
import Html.Events exposing (onClick, onInput)
import TVShowResult exposing (..)
import TVShowEpisode exposing (TVShowEpisode)
import Debug
import Http
import Task exposing (andThen)
import Api
import Dict


-- Model

type alias TVShowModel =
  { id : Int, lastEpisodeWatched : Int, name : String, image : Maybe String, episodes : List TVShowEpisode }

type alias Model =
    { list : List TVShowModel, error : Maybe String }


type alias ShowAndEpisodes =
    ( Int, List TVShowEpisode )


model =
    { list = [], error = Nothing }



-- Update


port saveShow : TVShowModel -> Cmd msg


port updateWatchedEpisode : TVShowModel -> Cmd msg


port loadShows : (List TVShowModel -> msg) -> Sub msg


subscriptions : Model -> Sub Msg
subscriptions model =
    loadShows LoadShows


type Msg
    = AddToList TVShowResult
    | LoadShows (List TVShowModel)
    | ShowError Http.Error
    | UpdateEpisodes (List ShowAndEpisodes)
    | UpdateShowEpisodes ShowAndEpisodes
    | MarkEpisodesWatched TVShowModel


fetchShow show =
    (Api.getEpisodes show.id) `andThen` (\episodes -> Task.succeed ( show.id, episodes ))


addEpisodesToShows shows episodesForShows =
    let
        showEpisodes =
            Dict.fromList episodesForShows
    in
        List.map (\show -> { show | episodes = Maybe.withDefault [] (Dict.get show.id showEpisodes) }) shows

getLatestEpisode show =
    case (List.reverse show.episodes) of
        [] ->
            0
        last :: rest ->
            last.id


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        AddToList result ->
            let
                getImage show =
                    case show.image of
                        Nothing ->
                            Nothing

                        Just image ->
                            Just image.medium

                newShow =
                    { id = result.show.id, name = result.show.name, image = (getImage result.show), lastEpisodeWatched = 0, episodes = [] }

                newList =
                    newShow :: model.list
            in
                ( { model | list = newList }, Cmd.batch [ saveShow newShow, Task.perform ShowError UpdateShowEpisodes (fetchShow newShow) ] )

        LoadShows shows ->
            ( { model | list = shows }, Task.perform ShowError UpdateEpisodes (Task.sequence (List.map fetchShow shows)) )

        ShowError error ->
            case error of
                Http.UnexpectedPayload err ->
                    ( { model | error = Just err }, Cmd.none )

                _ ->
                    ( { model | error = Just "Something terrible has happened" }, Cmd.none )

        UpdateEpisodes episodesForShows ->
            let
                episodeList =
                    addEpisodesToShows model.list episodesForShows
            in
                ( { model | list = episodeList }, Cmd.none )

        UpdateShowEpisodes ( id, episodes ) ->
            let
                newlist =
                    List.map
                        (\show ->
                            (if show.id == id then
                                { show | episodes = episodes }
                             else
                                show
                            )
                        )
                        model.list
            in
                ( { model | list = newlist }, Cmd.none )

        MarkEpisodesWatched showToUpdate ->
            let
                updatedShow =
                    { showToUpdate | lastEpisodeWatched = getLatestEpisode showToUpdate }

                newlist =
                    List.map
                        (\show ->
                            (if show.id == showToUpdate.id then
                                updatedShow
                             else
                                show
                            )
                        )
                        model.list
            in
                ( { model | list = newlist }, updateWatchedEpisode updatedShow )


-- View


viewShow show =
    let
        unwatchedEpisodes =
            case show.lastEpisodeWatched of
                0 ->
                    List.length show.episodes

                _ ->
                    List.length (List.filter (\episode -> episode.id > show.lastEpisodeWatched) show.episodes)

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
                            (if (List.length show.episodes > 0) then
                                unwatchedEpisodesDesc
                             else
                                ""
                            )
                        ]
                    , (if unwatchedEpisodes /= 0 then
                        button [ class "mui-btn mui-btn--primary", onClick (MarkEpisodesWatched show) ]
                            [ text "I'm caught up" ]
                        else
                            div [] []
                        )
                    ]
                ]
            ]


view model =
    case model.list of
        [] ->
            div [] []

        xs ->
            case model.error of
                Just err ->
                    div []
                        [ text err ]

                Nothing ->
                    div [ class "mui-panel", style [ ( "margin-top", "15px" ), ( "margin-bottom", "15px" ) ] ]
                        ((List.map viewShow xs)
                            |> (List.intersperse (hr [] []))
                        )
