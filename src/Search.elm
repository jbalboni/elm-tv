module Search exposing (model, Model, view, update, Msg(..))

import Html exposing (Html, button, div, text, input, label, span, img, hr)
import Html.Attributes exposing (type', class, placeholder, style, src)
import Html.Events exposing (onClick, onInput)
import TVShowResult exposing (..)
import Api
import Task
import Http
import TVShowResult exposing (TVShowResult)
import Markdown


-- MODEL


type alias Model =
    { visible : Bool, term : String, results : List TVShowResult, error : Maybe String }


model : Model
model =
    { term = "", visible = False, results = [], error = Nothing }


-- UPDATE


type Msg
    = UpdateTerm String
    | Search
    | ShowResults (List TVShowResult)
    | ShowError Http.Error
    | ShowSearch
    | HideSearch
    | AddShow TVShowResult


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        UpdateTerm term ->
            ( { model | term = term }, Cmd.none )

        Search ->
            ( model, Task.perform ShowError ShowResults (Api.searchShows model.term) )

        ShowResults results ->
            ( { model | results = results }, Cmd.none )

        ShowError error ->
            case error of
                Http.UnexpectedPayload err ->
                    ( { model | error = Just err }, Cmd.none )

                _ ->
                    ( { model | error = Just "Something terrible has happened" }, Cmd.none )

        ShowSearch ->
            ( { model | visible = True }, Cmd.none )

        HideSearch ->
            ( { model | visible = False }, Cmd.none )

        AddShow _ ->
            ( { model | visible = False }, Cmd.none )



-- VIEW


getImage image =
    let
        placeholder =
            { medium = "http://lorempixel.com/72/100/abstract" }
    in
        case image of
            Nothing ->
                placeholder.medium

            Just img ->
                img.medium


viewTVShowResult result =
    div []
        [ div [ style [ ( "display", "flex" ), ( "overflow", "auto" ), ( "min-height", "100px" ), ( "margin-bottom", "15px" ) ] ]
            [ img [ style [ ( "height", "100px" ) ], src (getImage result.show.image) ]
                []
            , div [ style [ ( "padding-left", "15px" ), ( "flex", "1" ) ] ]
                [ div [ class "mui--text-title" ]
                    [ text result.show.name ]
                , div [ class "mui--text-subhead" ]
                    [ text (
                        case result.show.network of
                            Nothing ->
                                ""
                            Just network ->
                                network.name
                    ) ]
                , div []
                    [ Markdown.toHtml [] result.show.summary ]
                , div []
                    [ button [ onClick (AddShow result), class "mui-btn mui-btn--primary" ]
                        [ text "Add" ]
                    ]
                ]
            ]
        ]


viewResults results =
    div [ class "mui-panel" ]
        ((List.map viewTVShowResult results)
            |> (List.intersperse (hr [] []))
        )


viewError error =
    div [ class "mui-panel" ]
        [ text (Maybe.withDefault "" error) ]


expandedView model =
    div []
        [ div [ style [ ( "padding-top", "15px" ), ( "padding-bottom", "15px" ) ] ]
            [ div [ class "mui-textfield mui-textfield--float-label" ]
                [ input [ type' "text", onInput UpdateTerm ]
                    []
                , label []
                    [ text "Search for shows" ]
                ]
            , button [ onClick Search, class "mui-btn mui-btn--primary", style [ ( "text-align", "right" ) ] ]
                [ text "Search" ]
            , button [ onClick HideSearch, class "mui-btn mui-btn--danger" ]
                [ text "Cancel" ]
            ]
        , if (List.length model.results) > 0 then
            viewResults model.results
          else if model.error /= Nothing then
            viewError model.error
          else
            div [] []
        ]


collapsedView model =
    div [ style [ ( "padding-top", "15px" ), ( "padding-bottom", "15px" ) ] ]
        [ button [ onClick ShowSearch, class "mui-btn mui-btn--primary" ]
            [ text "Show search" ]
        ]


view : Model -> Html Msg
view model =
    if model.visible then
        (expandedView model)
    else
        collapsedView model
