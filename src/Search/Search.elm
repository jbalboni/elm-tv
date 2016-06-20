module Search.Search exposing (init, Model, view, update, Msg(..))

import Set exposing (Set)
import Html exposing (Html, button, div, text, input, label, span, img, hr, form)
import Html.Attributes exposing (type', class, placeholder, style, src, disabled, id, for)
import Html.Events exposing (onClick, onInput, onSubmit)
import Api.Types exposing (TVShowResult)
import Api.Api as Api
import Task exposing (andThen)
import Http
import Markdown
import Date exposing (Date)
import Date.Extra.Core exposing (fromTime)
import GlobalPorts exposing (scrollPosition, focusElement)


-- MODEL


type alias Model =
    { visible : Bool, term : String, results : List TVShowResult, error : Maybe String }


model : Model
model =
    { term = "", visible = False, results = [], error = Nothing }


init =
    ( model, Cmd.none )



-- UPDATE


type Msg
    = UpdateTerm String
    | SearchShows
    | ShowResults (List TVShowResult)
    | ShowError Http.Error
    | ShowSearch
    | HideSearch
    | StartAdd TVShowResult
    | AddShow ( Date, TVShowResult )
    | SwallowError String


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        UpdateTerm term ->
            ( { model | term = term }, Cmd.none )

        SearchShows ->
            ( model, Task.perform ShowError ShowResults (Api.searchShows model.term) )

        ShowResults results ->
            ( { model | results = results }, focusElement ".elmtv__search-results .mdl-button:not([disabled]):first-child" )

        ShowError error ->
            case error of
                Http.UnexpectedPayload err ->
                    ( { model | error = Just err }, Cmd.none )

                _ ->
                    ( { model | error = Just "Sorry, something went wrong during your search. You might be offline." }, Cmd.none )

        ShowSearch ->
            ( { model | visible = True }, Cmd.batch [ scrollPosition 0, focusElement "#searchInput" ] )

        HideSearch ->
            ( { model | visible = False }, Cmd.none )

        StartAdd result ->
            ( { model | visible = False, results = [] }, Date.now `andThen` (\date -> Task.succeed ( date, result )) |> Task.perform SwallowError AddShow )

        AddShow _ ->
            ( model, Cmd.none )

        SwallowError err ->
            ( model, Cmd.none )



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
                [ div [ class "mdl-typography--headline" ]
                    [ text result.show.name ]
                , div [ class "mdl-typography--title" ]
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
                    button [ onClick (StartAdd result), class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored" ]
                        [ text "Add" ]

                True ->
                    button [ class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored", disabled True ]
                        [ text "Already added" ]
              )
            ]
        ]


viewResults results shows =
    div [ class "elmtv__panel mdl-shadow--2dp elmtv__search-results" ]
        ((List.map (viewTVShowResult shows) results)
            |> (List.intersperse (hr [] []))
        )


viewError error =
    div [ class "elmtv__panel mdl-shadow--2dp" ]
        [ text (Maybe.withDefault "" error) ]


expandedView model shows =
    form [ onSubmit SearchShows ]
        [ div [ style [ ( "padding-top", "15px" ), ( "padding-bottom", "15px" ) ] ]
            [ div []
                [ div [ class "mdl-textfield mdl-js-textfield mdl-textfield--floating-label" ]
                    [ input [ type' "text", onInput UpdateTerm, class "mdl-textfield__input", id "searchInput" ]
                        []
                    , label [ class "mdl-textfield__label", for "searchInput" ]
                        [ text "Search for shows" ]
                    ]
                ]
            , button [ type' "submit", class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored elmtv__button--spacing" ]
                [ text "Search" ]
            , button [ type' "button", onClick HideSearch, class "mdl-button mdl-js-button mdl-button--flat mdl-button--accent" ]
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
    div [ class "elmtv__search--collapsed" ]
        [ div [ style [ ( "float", "right" ) ] ]
            [ button [ class "mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored", onClick ShowSearch ]
                [ span [ class "material-icons" ]
                    [ text "add" ]
                ]
            ]
        ]


view : Model -> Set Int -> Html Msg
view model shows =
    if model.visible then
        (expandedView model shows)
    else
        collapsedView model
