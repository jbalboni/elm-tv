module Api exposing (..)

import Http
import Json.Decode as Json
import Task
import TVShowResult exposing (TVShowResult, decodeTVShowResult)
import TVShowEpisode exposing (decodeTVShowEpisode)


baseUrl =
    "http://api.tvmaze.com"


decodeShows =
    Json.list decodeTVShowResult


decodeEpisodes =
    Json.list decodeTVShowEpisode


searchShows query =
    Http.get decodeShows (baseUrl ++ "/search/shows?q=" ++ Http.uriEncode (query))


getEpisodes showId =
    Http.get decodeEpisodes (baseUrl ++ "/shows/" ++ (toString showId) ++ "/episodes")
