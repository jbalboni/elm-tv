module Search exposing (model, Model, view, update, Msg(..))

import Set exposing (Set)
import Html exposing (Html, button, div, text, input, label, span, img, hr, form)
import Html.Attributes exposing (type', class, placeholder, style, src, disabled)
import Html.Events exposing (onClick, onInput, onSubmit)
import Api.Types exposing (TVShowResult)
import Api
import Task
import Http
import Markdown
import Html.CssHelpers
import Search.Styles exposing (CssClasses(..), componentNamespace)


namespace =
    Html.CssHelpers.withNamespace componentNamespace


localClass =
    namespace.class



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


viewTVShowResult shows result =
    div []
        [ div [ style [ ( "display", "flex" ), ( "overflow", "auto" ), ( "min-height", "100px" ), ( "margin-bottom", "15px" ) ] ]
            [ img [ style [ ( "height", "100px" ) ], src (getImage result.show.image) ]
                []
            , div [ style [ ( "padding-left", "15px" ), ( "flex", "1" ) ] ]
                [ div [ class "mui--text-title" ]
                    [ text result.show.name ]
                , div [ class "mui--text-subhead" ]
                    [ text
                        (case result.show.network of
                            Nothing ->
                                ""

                            Just network ->
                                network.name
                        )
                    ]
                , div []
                    [ Markdown.toHtml [] result.show.summary ]
                ]
            ]
        , div []
            [ (case (Set.member result.show.id shows) of
                False ->
                    button [ onClick (AddShow result), class "mui-btn mui-btn--primary" ]
                        [ text "Add" ]

                True ->
                    button [ class "mui-btn mui-btn--primary", disabled True ]
                        [ text "Already added" ]
              )
            ]
        ]


viewResults results shows =
    div [ class "mui-panel" ]
        ((List.map (viewTVShowResult shows) results)
            |> (List.intersperse (hr [] []))
        )


viewError error =
    div [ class "mui-panel" ]
        [ text (Maybe.withDefault "" error) ]


expandedView model shows =
    form [ onSubmit Search ]
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
            viewResults model.results shows
          else if model.error /= Nothing then
            viewError model.error
          else
            div [] []
        ]


collapsedView model =
    div [ localClass [ SearchCollapsed ] ]
        [ button [ onClick ShowSearch, class "mui-btn mui-btn--fab mui-btn--accent", style [ ( "float", "right" ) ] ]
            [ text "+" ]
        ]


view : Model -> Set Int -> Html Msg
view model shows =
    if model.visible then
        (expandedView model shows)
    else
        collapsedView model