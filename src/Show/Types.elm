module Show.Types exposing (Model, Show, ShowRemoval, Msg(..))

import Dict
import Date exposing (Date)
import Http
import Api.Types exposing (TVShowEpisode)


type alias Episode =
    { id : Int, name : String, summary : String, season : Int, number : Int, airstamp : String }


type alias Season =
    { number : Int, episodes : List Episode }


type alias Show =
    { id : Int, lastEpisodeWatched : ( Int, Int ), name : String, image : Maybe String, seasons : List Season, rev : String, added : String }


type alias Model =
    { today : Date, show : Show, seasonsListVisible : Bool, visibleSeasons : Dict.Dict Int Bool }


type alias ShowRemoval =
    { id : Int, rev : String, name : String }


type Msg
    = ToggleSeason Int Bool
    | MarkAllEpisodesWatched
    | MarkSeasonWatched Int
    | MarkEpisodeWatched ( Int, Int )
    | ToggleSeasons Bool
    | UpdateShow
    | UpdateEpisodes (List TVShowEpisode)
    | ShowError Http.Error
    | ShowTimeError String
    | SetTodaysDate Date
    | SetRev String
    | RemoveShow ShowRemoval
