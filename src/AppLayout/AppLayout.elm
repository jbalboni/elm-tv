port module AppLayout.AppLayout exposing (Model, init, Msg, view, update, subscriptions)

import Html exposing (Html, button, div, text, input, label, span, a, header, main', nav)
import Html.App as App
import Html.Attributes exposing (type', class, placeholder, href, style, classList)
import Html.Events exposing (onClick)
import Set exposing (Set)
import ShowList.View as ShowListView
import ShowList.Types as ShowListTypes exposing (Msg(AddToList, ToggleShowUnwatchedOnly))
import ShowList.State as ShowListState
import Search.Types as SearchTypes
import Search.View as SearchView
import Search.State as SearchState
import Login.Login as Login


-- MODEL


type Tab
    = EpisodesToWatch
    | AllShows


type alias Model =
    { search : SearchTypes.Model, shows : ShowListTypes.Model, login : Login.Model, activeTab : Tab }


init =
    let
        ( searchModel, searchCmd ) =
            SearchState.init

        ( showListModel, showListCmd ) =
            ShowListState.init True
    in
        ( { search = searchModel
          , shows = showListModel
          , login = Login.model
          , activeTab = EpisodesToWatch
          }
        , Cmd.batch [ Cmd.map SearchMsg searchCmd, Cmd.map ShowsMsg showListCmd ]
        )



-- UPDATE


type Msg
    = SearchMsg SearchTypes.Msg
    | ShowsMsg ShowListTypes.Msg
    | LoginMsg Login.Msg
    | ChangeTab Tab


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ Sub.map ShowsMsg (ShowListState.subscriptions model.shows)
        , Sub.map LoginMsg (Login.subscriptions model.login)
        ]


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ChangeTab tab ->
            let
                ( updatedShowModel, _ ) =
                    ShowListState.update (ToggleShowUnwatchedOnly (tab == EpisodesToWatch)) model.shows

                updatedModel =
                    { model | shows = updatedShowModel }
            in
                ( { updatedModel | activeTab = tab }, Cmd.none )

        SearchMsg a ->
            case a of
                SearchTypes.AddShow result ->
                    let
                        ( showsModel, showsCmd ) =
                            ShowListState.update (AddToList result) model.shows

                        ( searchModel, searchCmd ) =
                            SearchState.update a model.search
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
                            SearchState.update a model.search
                    in
                        ( { model | search = searchModel }, Cmd.map SearchMsg cmd )

        ShowsMsg a ->
            let
                ( showsModel, cmd ) =
                    ShowListState.update a model.shows
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
            [ div [ class "mdl-tabs is-upgraded mdl-js-tabs mdl-js-ripple-effect" ]
                [ div [ class "mdl-tabs__tab-bar" ]
                    [ a [ classList [ ( "mdl-tabs__tab", True ), ( "is-active", model.activeTab == EpisodesToWatch ) ], href "#", onClick (ChangeTab EpisodesToWatch) ]
                        [ text "Episodes to watch" ]
                    , a [ classList [ ( "mdl-tabs__tab", True ), ( "is-active", model.activeTab == AllShows ) ], href "#", onClick (ChangeTab AllShows) ]
                        [ text "All shows" ]
                    ]
                ]
            , div [ class "mdl-tabs__panel is-active" ]
                [ viewAllShows model ]
            ]
        , div [ class "mdl-snackbar mdl-js-snackbar js-elmtv__snackbar" ]
            [ div [ class "mdl-snackbar__text" ]
                []
            , button [ type' "button", class "mdl-snackbar__action" ]
                []
            ]
        ]


viewAllShows model =
    div [ class "elmtv__main-content" ]
        [ div [ class "mdl-grid" ]
            [ div [ class "mdl-cell mdl-cell--12-col" ]
                [ App.map SearchMsg (SearchView.view model.search (showDict model.shows))
                , App.map ShowsMsg (ShowListView.view model.shows)
                ]
            ]
        ]
