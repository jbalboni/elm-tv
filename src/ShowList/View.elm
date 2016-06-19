module ShowList.View exposing (view)

import Html exposing (Html, div, hr, text)
import Html.App as App
import Html.Lazy exposing (lazy)
import Html.Attributes exposing (style, class)
import ShowList.Types exposing (Model, Msg(..))
import Show.View as ShowView


view : Model -> Html Msg
view model =
    case model.list of
        [] ->
            div [] []

        xs ->
            div [ class "elmtv__panel mdl-shadow--2dp" ]
                ((List.map (\show -> App.map (ShowMsg show.show.id) (lazy ShowView.view show)) xs)
                    |> (List.intersperse (hr [] []))
                )
