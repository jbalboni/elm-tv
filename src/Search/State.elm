module Search.State exposing (init, update)

import Task exposing (andThen)
import Date exposing (Date)
import Http
import Search.Types exposing (Model, Msg(..))
import Api.Api as Api
import GlobalPorts exposing (scrollPosition, focusElement)


model : Model
model =
    { term = "", visible = False, results = [], error = Nothing }


init =
    ( model, Cmd.none )


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
