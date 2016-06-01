module AppLayout exposing (view)

import Html exposing (Html, button, div, text, input, label, span)
import Html.App as Html
import Html.Attributes exposing (type', class, placeholder)


view : String -> Html a -> Html a
view title content =
    div []
        [ div [ class "mui-appbar" ]
            [ div [ class "mui-container mui--appbar-height mui--appbar-line-height" ]
                [ span [ class "mui--text-headline" ]
                    [ text title ]
                ]
            ]
        , div [ class "mui-container" ]
            [ content
            ]
        ]
