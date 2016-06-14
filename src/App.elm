module Main exposing (..)

import Html.App as App
import AppLayout.AppLayout as AppLayout


main =
    App.program
        { init = AppLayout.init
        , view = AppLayout.view
        , update = AppLayout.update
        , subscriptions = AppLayout.subscriptions
        }
