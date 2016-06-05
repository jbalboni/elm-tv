module Show.Styles exposing (..)


import Css exposing (..)
import Css.Elements exposing (body, li)
import Css.Namespace exposing (namespace)


type CssClasses
    = ShowImage

componentNamespace =
    "c-show-"

css =
    (namespace componentNamespace)
    [ (.) ShowImage
        [ height  (px 200)
        ]
    , mediaQuery "screen and ( max-width: 600px )"
        [ (.) ShowImage
            [ height  (px 100)
            ]
        ]
    ]
