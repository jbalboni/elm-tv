module ShowList.Types exposing (Model, Msg(..), ShowRev)

import Date exposing (Date)
import Show.Types as ShowTypes
import Api.Types exposing (TVShowEpisode, TVShowResult)


type alias Model =
    { list : List ShowTypes.Model, error : Maybe String }


type alias ShowAndEpisodes =
    ( Int, List TVShowEpisode )


type alias ShowRev =
    { id : Int, rev : String }


type Msg
    = AddToList ( Date, TVShowResult )
    | LoadShows (List ShowTypes.Show)
    | ShowMsg Int ShowTypes.Msg
    | LoadRev ShowRev
