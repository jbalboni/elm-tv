port module Stylesheets exposing (..)

import Css.File exposing (..)
import Css exposing (stylesheet)
import App.Styles as AppStyles
import Show.Styles as ShowStyles
import Html exposing (div)
import Html.App as Html


port files : CssFileStructure -> Cmd msg


cssFiles : CssFileStructure
cssFiles =
    toFileStructure [ ( "styles.css", (List.concat [AppStyles.css, ShowStyles.css]) |> stylesheet |> compile  ) ]


main : Program Never
main =
    Html.program
        { init = ( (), files cssFiles )
        , view = \_ -> (div [] [])
        , update = \_ _ -> ( (), Cmd.none )
        , subscriptions = \_ -> Sub.none
        }
