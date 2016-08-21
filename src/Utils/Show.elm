module Utils.Show exposing (hasUnwatchedEpisode, getSeason, addEpisodesToShows, getAiredSeasons, hasSeasonBeenWatched, episodeWatched, getNextEpisode)

import Dict
import Date.Extra.Compare as Compare exposing (is, Compare2(..))
import Date exposing (Date)
import ShowList.Types exposing (ShowData, Episode)
import List.Extra exposing (takeWhile)
import Maybe exposing (andThen)


hasUnwatchedEpisode { lastEpisodeWatched, seasons } =
    List.concat (List.map (\season -> season.episodes) seasons)
        |> List.head
        |> (episodeWatched lastEpisodeWatched)
        |> not


episodeWatched ( watchedSeason, watchedEpisode ) episode =
    episode
        `andThen`
            (\ep ->
                if ep.season < watchedSeason then
                    Just True
                else if (ep.season == watchedSeason) && (ep.number <= watchedEpisode) then
                    Just True
                else
                    Just False
            )
        |> Maybe.withDefault True


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
    Result.toMaybe (Date.fromString episode.airstamp)
        `andThen` (\date -> Just (is After today date))
        |> Maybe.withDefault True


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
    seasons
        |> List.map (\season -> season.episodes)
        |> List.concat
        |> takeWhile (\episode -> not (episodeWatched lastEpisodeWatched (Just episode)))
        |> List.reverse
        |> List.head
