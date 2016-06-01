module Main exposing (..)

import Html.App as App
import Html exposing (Html, div)
import Search exposing (Msg(AddShow))
import Shows exposing (Msg(AddToList))
import AppLayout


main =
    App.program
        { init = ( model, Cmd.none )
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.map ShowsMsg (Shows.subscriptions model.shows)



-- MODEL


type alias Model =
    { search : Search.Model, shows : Shows.Model }


model : Model
model =
    { search = Search.model, shows = Shows.model }



-- UPDATE


type Msg
    = SearchMsg Search.Msg
    | ShowsMsg Shows.Msg


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



-- VIEW


view : Model -> Html Msg
view model =
    AppLayout.view "Elm TV"
        (div []
            [ App.map SearchMsg (Search.view model.search)
            , App.map ShowsMsg (Shows.view model.shows)
            ]
        )
