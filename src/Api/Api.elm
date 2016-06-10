module Api exposing (..)

import Http
import Json.Decode as Json
import Task
import Api.Types exposing (decodeTVShowResult, decodeTVShowEpisode)


baseUrl =
    "/api"


decodeShows =
    Json.list decodeTVShowResult


decodeEpisodes =
    Json.list decodeTVShowEpisode


searchShows query =
    Http.get decodeShows (baseUrl ++ "/search/shows?q=" ++ Http.uriEncode (query))


getEpisodes showId =
    Http.get decodeEpisodes (baseUrl ++ "/shows/" ++ (toString showId) ++ "/episodes")
