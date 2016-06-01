module TVShowEpisode exposing (..)

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
