module App.Styles exposing (..)

import Css exposing (..)
import Css.Elements exposing (body, li)
import Css.Namespace exposing (namespace)


type CssClasses
    = ShowImage
    | AppContainer


appNamespace =
    "app-"


css =
    (namespace appNamespace)
        [ body
            [ fontFamilies [ "Roboto", qt "Helvetica Neue", "Helvetica", "Arial" ]
            , backgroundColor (hex "f4f4f4")
            ]
        , (.) AppContainer
            [ paddingBottom (px 80) ]
        ]