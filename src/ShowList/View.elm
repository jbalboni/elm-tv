module ShowList.View exposing (view)

import Html exposing (Html, div, hr, text)
import Html.App as App
import Html.Lazy exposing (lazy)
import Html.Attributes exposing (style, class)
import ShowList.Types exposing (Model, Msg(..))
import ShowList.ShowView as ShowView


view : Model -> Html Msg
view model =
    case model.list of
        [] ->
            div [] []

        xs ->
            let
                shows =
                    case model.showOnlyShowsWithUnwatched of
                        True ->
                            List.filter (.show >> hasUnwatchedEpisode) xs

                        False ->
                            xs
            in
                div [ class "elmtv__panel" ]
                    ((List.map (\show -> lazy (ShowView.view model.today) show) shows)
                        |> (List.intersperse (hr [] []))
                    )

hasUnwatchedEpisode { lastEpisodeWatched, seasons } =
    List.concat (List.map (\season -> season.episodes) seasons)
    |> List.head
    |> (episodeWatched lastEpisodeWatched)
    |> not

episodeWatched ( watchedSeason, watchedEpisode ) episode =
    case episode of
        Nothing ->
            True

        Just ep ->
            if ep.season < watchedSeason then
                True
            else if (ep.season == watchedSeason) && (ep.number <= watchedEpisode) then
                True
            else
                False
