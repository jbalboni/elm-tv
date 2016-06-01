module TVShowResult exposing (TVShowResult, decodeTVShowResult)

import Json.Encode
import Json.Decode
import Json.Decode.Pipeline


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
    , network : TVShowResultShowNetwork
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


decodeTVShowResultShow_linksSelf : Json.Decode.Decoder TVShowResultShow_linksSelf
decodeTVShowResultShow_linksSelf =
    Json.Decode.Pipeline.decode TVShowResultShow_linksSelf
        |> Json.Decode.Pipeline.required "href" (Json.Decode.string)


decodeTVShowResultShow_linksPreviousepisode : Json.Decode.Decoder TVShowResultShow_linksPreviousepisode
decodeTVShowResultShow_linksPreviousepisode =
    Json.Decode.Pipeline.decode TVShowResultShow_linksPreviousepisode
        |> Json.Decode.Pipeline.required "href" (Json.Decode.string)


decodeTVShowResultShow_links : Json.Decode.Decoder TVShowResultShow_links
decodeTVShowResultShow_links =
    Json.Decode.Pipeline.decode TVShowResultShow_links
        |> Json.Decode.Pipeline.required "self" (decodeTVShowResultShow_linksSelf)
        |> Json.Decode.Pipeline.required "previousepisode" (decodeTVShowResultShow_linksPreviousepisode)


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
        |> Json.Decode.Pipeline.required "network" (decodeTVShowResultShowNetwork)
        |> Json.Decode.Pipeline.required "externals" (decodeTVShowResultShowExternals)
        |> Json.Decode.Pipeline.required "image" (Json.Decode.maybe decodeTVShowResultShowImage)
        |> Json.Decode.Pipeline.required "summary" (Json.Decode.string)
        |> Json.Decode.Pipeline.required "updated" (Json.Decode.int)


encodeTVShowResult : TVShowResult -> Json.Encode.Value
encodeTVShowResult record =
    Json.Encode.object
        [ ( "score", Json.Encode.float <| record.score )
        , ( "show", encodeTVShowResultShow <| record.show )
        ]


encodeTVShowResultShowSchedule : TVShowResultShowSchedule -> Json.Encode.Value
encodeTVShowResultShowSchedule record =
    Json.Encode.object
        [ ( "time", Json.Encode.string <| record.time )
        , ( "days", Json.Encode.list <| List.map Json.Encode.string <| record.days )
        ]


encodeTVShowResultShowRating : TVShowResultShowRating -> Json.Encode.Value
encodeTVShowResultShowRating record =
    Json.Encode.object
        [ ( "average", Json.Encode.float <| (Maybe.withDefault 0.0 record.average) )
        ]


encodeTVShowResultShowNetworkCountry : TVShowResultShowNetworkCountry -> Json.Encode.Value
encodeTVShowResultShowNetworkCountry record =
    Json.Encode.object
        [ ( "name", Json.Encode.string <| record.name )
        , ( "code", Json.Encode.string <| record.code )
        , ( "timezone", Json.Encode.string <| record.timezone )
        ]


encodeTVShowResultShowNetwork : TVShowResultShowNetwork -> Json.Encode.Value
encodeTVShowResultShowNetwork record =
    Json.Encode.object
        [ ( "id", Json.Encode.int <| record.id )
        , ( "name", Json.Encode.string <| record.name )
        , ( "country", encodeTVShowResultShowNetworkCountry <| record.country )
        ]


encodeTVShowResultShowExternals : TVShowResultShowExternals -> Json.Encode.Value
encodeTVShowResultShowExternals record =
    Json.Encode.object
        [ ( "tvrage", Json.Encode.int <| (Maybe.withDefault 0 record.tvrage) )
        , ( "thetvdb", Json.Encode.int <| (Maybe.withDefault 0 record.thetvdb) )
        , ( "imdb", Json.Encode.string <| (Maybe.withDefault "" record.imdb) )
        ]


encodeTVShowResultShowImage : TVShowResultShowImage -> Json.Encode.Value
encodeTVShowResultShowImage record =
    Json.Encode.object
        [ ( "medium", Json.Encode.string <| record.medium )
        , ( "original", Json.Encode.string <| record.original )
        ]


encodeTVShowResultShow_linksSelf : TVShowResultShow_linksSelf -> Json.Encode.Value
encodeTVShowResultShow_linksSelf record =
    Json.Encode.object
        [ ( "href", Json.Encode.string <| record.href )
        ]


encodeTVShowResultShow_linksPreviousepisode : TVShowResultShow_linksPreviousepisode -> Json.Encode.Value
encodeTVShowResultShow_linksPreviousepisode record =
    Json.Encode.object
        [ ( "href", Json.Encode.string <| record.href )
        ]


encodeTVShowResultShow_links : TVShowResultShow_links -> Json.Encode.Value
encodeTVShowResultShow_links record =
    Json.Encode.object
        [ ( "self", encodeTVShowResultShow_linksSelf <| record.self )
        , ( "previousepisode", encodeTVShowResultShow_linksPreviousepisode <| record.previousepisode )
        ]


encodeTVShowResultShow : TVShowResultShow -> Json.Encode.Value
encodeTVShowResultShow record =
    Json.Encode.object
        [ ( "id", Json.Encode.int <| record.id )
        , ( "url", Json.Encode.string <| record.url )
        , ( "name", Json.Encode.string <| record.name )
        , ( "type", Json.Encode.string <| record.type' )
        , ( "language", Json.Encode.string <| record.language )
        , ( "genres", Json.Encode.list <| List.map Json.Encode.string <| record.genres )
        , ( "status", Json.Encode.string <| record.status )
        , ( "runtime", Json.Encode.int <| (Maybe.withDefault 0 record.runtime) )
        , ( "premiered", Json.Encode.string <| (Maybe.withDefault "" record.premiered) )
        , ( "schedule", encodeTVShowResultShowSchedule <| record.schedule )
        , ( "rating", encodeTVShowResultShowRating <| record.rating )
        , ( "weight", Json.Encode.int <| record.weight )
        , ( "network", encodeTVShowResultShowNetwork <| record.network )
        , ( "externals", encodeTVShowResultShowExternals <| record.externals )
        , ( "image", encodeTVShowResultShowImage <| (Maybe.withDefault { medium = "", original = "" } record.image) )
        , ( "summary", Json.Encode.string <| record.summary )
        , ( "updated", Json.Encode.int <| record.updated )
        ]
