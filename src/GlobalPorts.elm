port module GlobalPorts exposing (..)


port showNotification : String -> Cmd msg


port scrollPosition : Int -> Cmd msg


port focusElement : String -> Cmd msg
