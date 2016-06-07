module Show.Styles exposing (..)

import Css exposing (..)
import Css.Elements exposing (body, li)
import Css.Namespace exposing (namespace)


type CssClasses
    = ShowImage
    | Button


componentNamespace =
    "c-show-"


css =
    (namespace componentNamespace)
        [ (.) ShowImage
            [ height (px 200)
            ]
        , (.) Button
            [ width (px 136)
            ]
        , mediaQuery "screen and ( max-width: 600px )"
            [ (.) ShowImage
                [ height (px 100)
                ]
            ]
        , mediaQuery "screen and ( max-width: 342px )"
            [ (.) Button
                [ marginRight (px 8)
                ]
            ]
        ]
