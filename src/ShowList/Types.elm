module ShowList.Types exposing (Model, Msg(..), ShowRev, ShowRemoval, Show, ShowModel)

import Date exposing (Date)
import Api.Types exposing (TVShowEpisode, TVShowResult)
import Dict
import Http


type alias Model =
    { list : List ShowModel, error : Maybe String, showOnlyShowsWithUnwatched : Bool, today : Date }


type alias ShowAndEpisodes =
    ( Int, List TVShowEpisode )


type alias ShowRev =
    { id : Int, rev : String }


type alias Episode =
    { id : Int, name : String, summary : String, season : Int, number : Int, airstamp : String }


type alias Season =
    { number : Int, episodes : List Episode }


type alias Show =
    { id : Int, lastEpisodeWatched : ( Int, Int ), name : String, image : Maybe String, seasons : List Season, rev : String, added : String }


type alias ShowModel =
    { show : Show, seasonsListVisible : Bool, visibleSeasons : Dict.Dict Int Bool }


type alias ShowRemoval =
    { id : Int, rev : String, name : String }


type Msg
    = ToggleSeason Int Int Bool
    | MarkAllEpisodesWatched Int
    | MarkSeasonWatched Int Int
    | MarkEpisodeWatched Int ( Int, Int )
    | ToggleSeasons Int Bool
    | UpdateShow Int
    | UpdateEpisodes Int (List TVShowEpisode)
    | ShowError Http.Error
    | ShowTimeError String
    | SetTodaysDate Date
    | SetRev ShowRev
    | RemoveShow ShowRemoval
    | AddToList ( Date, TVShowResult )
    | LoadShows (List Show)
    | ToggleShowUnwatchedOnly Bool
