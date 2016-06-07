module Api.Types exposing (..)

import Json.Encode
import Json.Decode
import Json.Decode.Pipeline


type alias TVShowEpisode =
    { id : Int
    , url : String
    , name : String
    , season : Int
    , number : Int
    , airdate : String
    , airtime : String
    , airstamp : String
    , runtime : Int
    , summary : String
    }


type alias TVShowEpisodeImage =
    { medium : String
    , original : String
    }


type alias TVShowEpisode_linksSelf =
    { href : String
    }


type alias TVShowEpisode_links =
    { self : TVShowEpisode_linksSelf
    }


decodeTVShowEpisode : Json.Decode.Decoder TVShowEpisode
decodeTVShowEpisode =
    Json.Decode.Pipeline.decode TVShowEpisode
        |> Json.Decode.Pipeline.required "id" (Json.Decode.int)
        |> Json.Decode.Pipeline.required "url" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "name" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "season" (Json.Decode.int)
        |> Json.Decode.Pipeline.required "number" (Json.Decode.int)
        |> Json.Decode.Pipeline.required "airdate" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "airtime" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "airstamp" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "runtime" (Json.Decode.int)
        |> Json.Decode.Pipeline.required "summary" (Json.Decode.string)


encodeTVShowEpisode : TVShowEpisode -> Json.Encode.Value
encodeTVShowEpisode record =
    Json.Encode.object
        [ ( "id", Json.Encode.int <| record.id )
        , ( "url", Json.Encode.string <| record.url )
        , ( "name", Json.Encode.string <| record.name )
        , ( "season", Json.Encode.int <| record.season )
        , ( "number", Json.Encode.int <| record.number )
        , ( "airdate", Json.Encode.string <| record.airdate )
        , ( "airtime", Json.Encode.string <| record.airtime )
        , ( "airstamp", Json.Encode.string <| record.airstamp )
        , ( "runtime", Json.Encode.int <| record.runtime )
        , ( "summary", Json.Encode.string <| record.summary )
        ]


type alias TVShowResult =
    { score : Float
    , show : TVShowResultShow
    }


type alias TVShowResultShowSchedule =
    { time : String
    , days : List String
    }


type alias TVShowResultShowRating =
    { average : Maybe Float
    }


type alias TVShowResultShowNetworkCountry =
    { name : String
    , code : String
    , timezone : String
    }


type alias TVShowResultShowNetwork =
    { id : Int
    , name : String
    , country : TVShowResultShowNetworkCountry
    }


type alias TVShowResultShowExternals =
    { tvrage : Maybe Int
    , thetvdb : Maybe Int
    , imdb : Maybe String
    }


type alias TVShowResultShowImage =
    { medium : String
    , original : String
    }


type alias TVShowResultShow_linksSelf =
    { href : String
    }


type alias TVShowResultShow_linksPreviousepisode =
    { href : String
    }


type alias TVShowResultShow_links =
    { self : TVShowResultShow_linksSelf
    , previousepisode : TVShowResultShow_linksPreviousepisode
    }


type alias TVShowResultShow =
    { id : Int
    , url : String
    , name : String
    , type' : String
    , language : String
    , genres : List String
    , status : String
    , runtime : Maybe Int
    , premiered : Maybe String
    , schedule : TVShowResultShowSchedule
    , rating : TVShowResultShowRating
    , weight : Int
    , network : Maybe TVShowResultShowNetwork
    , externals : TVShowResultShowExternals
    , image : Maybe TVShowResultShowImage
    , summary : String
    , updated : Int
    }


decodeTVShowResult : Json.Decode.Decoder TVShowResult
decodeTVShowResult =
    Json.Decode.Pipeline.decode TVShowResult
        |> Json.Decode.Pipeline.required "score" (Json.Decode.float)
        |> Json.Decode.Pipeline.required "show" (decodeTVShowResultShow)


decodeTVShowResultShowSchedule : Json.Decode.Decoder TVShowResultShowSchedule
decodeTVShowResultShowSchedule =
    Json.Decode.Pipeline.decode TVShowResultShowSchedule
        |> Json.Decode.Pipeline.required "time" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "days" (Json.Decode.list Json.Decode.string)


decodeTVShowResultShowRating : Json.Decode.Decoder TVShowResultShowRating
decodeTVShowResultShowRating =
    Json.Decode.Pipeline.decode TVShowResultShowRating
        |> Json.Decode.Pipeline.required "average" (Json.Decode.maybe Json.Decode.float)


decodeTVShowResultShowNetworkCountry : Json.Decode.Decoder TVShowResultShowNetworkCountry
decodeTVShowResultShowNetworkCountry =
    Json.Decode.Pipeline.decode TVShowResultShowNetworkCountry
        |> Json.Decode.Pipeline.required "name" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "code" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "timezone" (Json.Decode.string)


decodeTVShowResultShowNetwork : Json.Decode.Decoder TVShowResultShowNetwork
decodeTVShowResultShowNetwork =
    Json.Decode.Pipeline.decode TVShowResultShowNetwork
        |> Json.Decode.Pipeline.required "id" (Json.Decode.int)
        |> Json.Decode.Pipeline.required "name" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "country" (decodeTVShowResultShowNetworkCountry)


decodeTVShowResultShowExternals : Json.Decode.Decoder TVShowResultShowExternals
decodeTVShowResultShowExternals =
    Json.Decode.Pipeline.decode TVShowResultShowExternals
        |> Json.Decode.Pipeline.required "tvrage" (Json.Decode.maybe Json.Decode.int)
        |> Json.Decode.Pipeline.required "thetvdb" (Json.Decode.maybe Json.Decode.int)
        |> Json.Decode.Pipeline.required "imdb" (Json.Decode.maybe Json.Decode.string)


decodeTVShowResultShowImage : Json.Decode.Decoder TVShowResultShowImage
decodeTVShowResultShowImage =
    Json.Decode.Pipeline.decode TVShowResultShowImage
        |> Json.Decode.Pipeline.required "medium" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "original" (Json.Decode.string)


decodeTVShowResultShow : Json.Decode.Decoder TVShowResultShow
decodeTVShowResultShow =
    Json.Decode.Pipeline.decode TVShowResultShow
        |> Json.Decode.Pipeline.required "id" (Json.Decode.int)
        |> Json.Decode.Pipeline.required "url" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "name" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "type" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "language" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "genres" (Json.Decode.list Json.Decode.string)
        |> Json.Decode.Pipeline.required "status" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "runtime" (Json.Decode.maybe Json.Decode.int)
        |> Json.Decode.Pipeline.required "premiered" (Json.Decode.maybe Json.Decode.string)
        |> Json.Decode.Pipeline.required "schedule" (decodeTVShowResultShowSchedule)
        |> Json.Decode.Pipeline.required "rating" (decodeTVShowResultShowRating)
        |> Json.Decode.Pipeline.required "weight" (Json.Decode.int)
        |> Json.Decode.Pipeline.required "network" (Json.Decode.maybe decodeTVShowResultShowNetwork)
        |> Json.Decode.Pipeline.required "externals" (decodeTVShowResultShowExternals)
        |> Json.Decode.Pipeline.required "image" (Json.Decode.maybe decodeTVShowResultShowImage)
        |> Json.Decode.Pipeline.required "summary" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "updated" (Json.Decode.int)
