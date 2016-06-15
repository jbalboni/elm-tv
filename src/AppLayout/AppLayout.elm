port module AppLayout.AppLayout exposing (Model, init, Msg, view, update, subscriptions)

import Html exposing (Html, button, div, text, input, label, span, a, header, main', nav)
import Html.App as App
import Html.Attributes exposing (type', class, placeholder, href, style)
import Html.Events exposing (onClick)
import Set exposing (Set)
import Search.Search as Search exposing (Msg(AddShow))
import Shows.Shows as Shows exposing (Msg(AddToList))


-- MODEL


type alias Model =
    { search : Search.Model, shows : Shows.Model }


init =
    ( { search = Search.model
      , shows = Shows.model
      }
    , Cmd.none
    )



-- UPDATE


type Msg
    = SearchMsg Search.Msg
    | ShowsMsg Shows.Msg
    | LoginUser


port logInUser : Bool -> Cmd msg


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.map ShowsMsg (Shows.subscriptions model.shows)


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

        LoginUser ->
            ( model, logInUser True )



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
                , nav [ class "mdl-navigation" ]
                    [ a [ class "mdl-navigation__link", href "#", onClick LoginUser ]
                        [ text "Sign in" ]
                    ]
                ]
            ]
        , main' [ class "mdl-layout__content" ]
            [ div [ class "page-content" ]
                [ viewContent model ]
            ]
        ]


viewContent model =
    div [ class "mdl-grid", style [ ( "max-width", "1200px" ) ] ]
        [ div [ class "mdl-cell mdl-cell--12-col" ]
            [ App.map SearchMsg (Search.view model.search (showDict model.shows))
            , App.map ShowsMsg (Shows.view model.shows)
            ]
        ]
