port module Shows exposing (Model, Msg(AddToList), model, view, update, subscriptions)

import Html exposing (Html, div, hr, text)
import Html.Attributes exposing (style, class)
import TVShowResult exposing (..)
import TVShowEpisode exposing (TVShowEpisode)
import Http
import Html.App as App
import Show exposing (Msg(UpdateShow, ShowError))


-- Model


type alias Model =
    { list : List Show.Model, error : Maybe String }


type alias ShowAndEpisodes =
    ( Int, List TVShowEpisode )


model =
    { list = [], error = Nothing }



-- Update


port loadShows : (List Show.Model -> msg) -> Sub msg


subscriptions : Model -> Sub Msg
subscriptions model =
    loadShows LoadShows


type Msg
    = AddToList TVShowResult
    | LoadShows (List Show.Model)
    | ShowMsg Int Show.Msg


updateHelp : Int -> Show.Msg -> Show.Model -> ( Show.Model, Cmd Msg )
updateHelp id msg show =
    if show.id /= id then
        ( show, Cmd.none )
    else
        let
            ( newShow, cmds ) =
                Show.update msg show
        in
            ( newShow
            , Cmd.map (ShowMsg id) cmds
            )


updateAll show =
    let
        ( newShow, cmds ) =
            Show.update UpdateShow show
    in
        ( newShow
        , Cmd.map (ShowMsg show.id) cmds
        )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ShowMsg id subMsg ->
            case subMsg of
                ShowError error ->
                    case error of
                        Http.UnexpectedPayload err ->
                            ( { model | error = Just err }, Cmd.none )

                        _ ->
                            ( { model | error = Just "Something terrible has happened" }, Cmd.none )

                _ ->
                    let
                        ( newShows, cmds ) =
                            List.unzip (List.map (updateHelp id subMsg) model.list)
                    in
                        ( { model | list = newShows }
                        , Cmd.batch cmds
                        )

        AddToList result ->
            let
                getImage show =
                    case show.image of
                        Nothing ->
                            Nothing

                        Just image ->
                            Just image.medium

                defaultShow =
                    Show.model

                ( newShow, cmds ) =
                    Show.update UpdateShow { defaultShow | id = result.show.id, name = result.show.name, image = (getImage result.show) }

                newList =
                    newShow :: model.list
            in
                ( { model | list = newList }, Cmd.map (ShowMsg newShow.id) cmds )

        LoadShows shows ->
            let
                ( updatedShows, cmds ) =
                    List.unzip (List.map (updateAll) shows)
            in
                ( { model | list = updatedShows }, Cmd.batch cmds )



-- View


view : Model -> Html Msg
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
                        ((List.map (\show -> App.map (ShowMsg show.id) (Show.view show)) xs)
                            |> (List.intersperse (hr [] []))
                        )