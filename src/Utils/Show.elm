module Utils.Show exposing (hasUnwatchedEpisode, getSeason, addEpisodesToShows, getAiredSeasons, hasSeasonBeenWatched, episodeWatched, getNextEpisode)

import Dict
import Date.Extra.Compare as Compare exposing (is, Compare2(..))
import Date exposing (Date)
import ShowList.Types exposing (ShowData, Episode)
import List.Extra exposing (takeWhile)


hasUnwatchedEpisode { lastEpisodeWatched, seasons } =
    List.concat (List.map (\season -> season.episodes) seasons)
        |> List.head
        |> (episodeWatched lastEpisodeWatched)
        |> not


episodeWatched ( watchedSeason, watchedEpisode ) episode =
    case episode of
        Nothing ->
            True

        Just ep ->
            if ep.season < watchedSeason then
                True
            else if (ep.season == watchedSeason) && (ep.number <= watchedEpisode) then
                True
            else
                False


getSeason episodes =
    case episodes of
        [] ->
            0

        first :: _ ->
            first.season


addEpisodesToShows shows episodesForShows =
    let
        showEpisodes =
            Dict.fromList episodesForShows
    in
        List.map
            (\show -> { show | episodes = Maybe.withDefault [] (Dict.get show.id showEpisodes) })
            shows


hasEpisodeAired today episode =
    case Result.toMaybe (Date.fromString episode.airstamp) of
        Nothing ->
            True

        Just date ->
            is After today date


getAiredSeasons today seasons =
    seasons
        |> List.map
            (\season ->
                { season
                    | episodes =
                        (List.filter (hasEpisodeAired today) season.episodes)
                }
            )
        |> List.filter (\season -> season.episodes /= [])


hasSeasonBeenWatched lastWatchedEpisode season =
    case season.episodes of
        [] ->
            False

        latest :: _ ->
            episodeWatched lastWatchedEpisode (Just latest)


getNextEpisode : ShowData -> Maybe Episode
getNextEpisode { lastEpisodeWatched, seasons } =
    let
        episodes =
            List.concat (List.map (\season -> season.episodes) seasons)

        unwatchedEpisodes =
            takeWhile (\episode -> not (episodeWatched lastEpisodeWatched (Just episode))) episodes
    in
        List.head (List.reverse unwatchedEpisodes)
