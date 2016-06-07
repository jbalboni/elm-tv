module Search.Styles exposing (..)

import Css exposing (..)
import Css.Elements exposing (body, li)
import Css.Namespace exposing (namespace)


type CssClasses
    = SearchCollapsed


componentNamespace =
    "c-search-"


css =
    (namespace componentNamespace)
        [ (.) SearchCollapsed
            [ paddingBottom (px 60)
            , marginTop (px -32)
            ]
        , mediaQuery "screen and ( max-width: 450px )"
            [ (.) SearchCollapsed
                [ paddingBottom (px 0)
                , marginTop (px 0)
                , position fixed
                , bottom (px 15)
                , right (px 15)
                ]
            ]
        ]
