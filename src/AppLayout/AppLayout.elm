port module AppLayout.AppLayout exposing (Model, init, Msg, view, update, subscriptions)

import Html exposing (Html, button, div, text, input, label, span, a, header, main', nav)
import Html.App as App
import Html.Attributes exposing (type', class, placeholder, href, style)
import Html.Events exposing (onClick)
import Set exposing (Set)
import Search.Search as Search exposing (Msg(AddShow))
import Shows.Shows as Shows exposing (Msg(AddToList))
import Login.Login as Login


-- MODEL


type alias Model =
    { search : Search.Model, shows : Shows.Model, login : Login.Model }


init =
    let
        ( searchModel, searchCmd ) =
            Search.init
    in
        ( { search = searchModel
          , shows = Shows.model
          , login = Login.model
          }
        , Cmd.map SearchMsg searchCmd
        )



-- UPDATE


type Msg
    = SearchMsg Search.Msg
    | ShowsMsg Shows.Msg
    | LoginMsg Login.Msg


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ Sub.map ShowsMsg (Shows.subscriptions model.shows)
        , Sub.map LoginMsg (Login.subscriptions model.login)
        ]


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        SearchMsg a ->
            case a of
                AddShow result ->
                    let
                        ( showsModel, showsCmd ) =
                            Shows.update (AddToList result) model.shows

                        ( searchModel, searchCmd ) =
                            Search.update a model.search
                    in
                        ( { model | shows = showsModel, search = searchModel }
                        , Cmd.batch
                            [ Cmd.map ShowsMsg showsCmd
                            , Cmd.map SearchMsg searchCmd
                            ]
                        )

                _ ->
                    let
                        ( searchModel, cmd ) =
                            Search.update a model.search
                    in
                        ( { model | search = searchModel }, Cmd.map SearchMsg cmd )

        ShowsMsg a ->
            let
                ( showsModel, cmd ) =
                    Shows.update a model.shows
            in
                ( { model | shows = showsModel }, Cmd.map ShowsMsg cmd )

        LoginMsg msg ->
            let
                ( loginModel, loginCmd ) =
                    Login.update msg model.login
            in
                ( { model | login = loginModel }, Cmd.map LoginMsg loginCmd )



-- VIEW


showDict shows =
    List.foldr (\show showSet -> Set.insert show.show.id showSet) Set.empty shows.list


view : Model -> Html Msg
view model =
    div [ class "mdl-layout mdl-js-layout mdl-layout--fixed-header" ]
        [ header [ class "mdl-layout__header" ]
            [ div [ class "mdl-layout__header-row elmtv__header--no-drawer" ]
                [ span [ class "mdl-layout-title" ]
                    [ text "Elm TV" ]
                , span [ class "mdl-layout-spacer" ]
                    []
                , App.map LoginMsg (Login.view model.login)
                ]
            ]
        , main' [ class "mdl-layout__content" ]
            [ div [ class "page-content" ]
                [ viewContent model ]
            ]
        , div [ class "mdl-snackbar mdl-js-snackbar js-elmtv__snackbar" ]
            [ div [ class "mdl-snackbar__text" ]
                []
            , button [ type' "button", class "mdl-snackbar__action" ]
                []
            ]
        ]


viewContent model =
    div [ class "mdl-grid", style [ ( "max-width", "1200px" ) ] ]
        [ div [ class "mdl-cell mdl-cell--12-col" ]
            [ App.map SearchMsg (Search.view model.search (showDict model.shows))
            , App.map ShowsMsg (Shows.view model.shows)
            ]
        ]
