module ShowList.View exposing (view)

import Html exposing (Html, div, hr, text)
import Html.App as App
import Html.Lazy exposing (lazy)
import Html.Attributes exposing (style, class)
import ShowList.Types exposing (Model, Msg(..))
import ShowList.ShowView as ShowView
import Utils.Show exposing (hasUnwatchedEpisode)


view : Model -> Html Msg
view model =
    let
        showView =
            if model.showOnlyShowsWithUnwatched then
                lazy (ShowView.viewUnwatched model.today)
            else
                lazy (ShowView.view model.today)

        showList =
            if model.showOnlyShowsWithUnwatched then
                List.filter (.showData >> hasUnwatchedEpisode) model.list
            else
                model.list
    in
        div [ class "elmtv__panel" ]
            ((List.map showView showList)
                |> (List.intersperse (hr [] []))
            )
