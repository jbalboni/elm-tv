module Search.Types exposing (Model, Msg(..))

import Date exposing (Date)
import Http
import Api.Types exposing (TVShowResult)


type alias Model =
    { visible : Bool, term : String, results : List TVShowResult, error : Maybe String }


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
