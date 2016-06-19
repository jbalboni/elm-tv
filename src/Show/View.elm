module Show.View exposing (view)

import Html exposing (Html, button, div, text, img, a, hr, span)
import Html.Attributes exposing (class, style, src, href, disabled)
import Html.Events exposing (onClick)
import Dict
import Markdown
import Date exposing (Date)
import Date.Extra.Compare as Compare exposing (is, Compare2(..))
import Show.Types exposing (Msg(..), Model)


view : Model -> Html Msg
view { today, show, visibleSeasons, seasonsListVisible } =
    let
        seasons =
            airedSeasons today show.seasons

        episodes =
            List.concat (List.map (\season -> season.episodes) seasons)

        numEpisodes =
            List.length episodes

        unwatchedEpisodes =
            case show.lastEpisodeWatched of
                ( 0, 0 ) ->
                    numEpisodes

                _ ->
                    List.length (List.filter (\episode -> not (episodeWatched show.lastEpisodeWatched episode)) episodes)

        unwatchedEpisodesDesc =
            case unwatchedEpisodes of
                0 ->
                    "All caught up"

                1 ->
                    (toString unwatchedEpisodes) ++ " episode to watch"

                _ ->
                    (toString unwatchedEpisodes) ++ " episodes to watch"
    in
        div []
            [ button [ onClick (RemoveShow { id = show.id, rev = show.rev, name = show.name }), class "mdl-button mdl-js-button mdl-button--icon mdl-button--accent elmtv__remove-show" ]
                [ span [ class "material-icons" ]
                    [ text "delete" ]
                ]
            , div [ style [ ( "display", "flex" ), ( "overflow", "visible" ), ( "min-height", "100px" ), ( "margin-bottom", "15px" ) ] ]
                [ img [ class "c-show-ShowImage", src (Maybe.withDefault "http://lorempixel.com/72/100/abstract" show.image) ]
                    []
                , div [ style [ ( "padding-left", "15px" ), ( "flex", "1" ) ] ]
                    [ div [ class "mdl-typography--headline" ]
                        [ text show.name ]
                    , div [ class "mdl-typography--title" ]
                        [ text
                            (if (numEpisodes > 0) then
                                unwatchedEpisodesDesc
                             else
                                ""
                            )
                        ]
                    ]
                ]
            , button [ onClick (ToggleSeasons (not seasonsListVisible)), class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored elmtv__button--spacing" ]
                [ text
                    (if seasonsListVisible then
                        "Hide seasons"
                     else
                        "Show seasons"
                    )
                ]
            , (if unwatchedEpisodes /= 0 then
                button [ class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent elmtv__button--spacing", onClick MarkAllEpisodesWatched ]
                    [ text "I'm caught up" ]
               else
                div [] []
              )
            , (if seasonsListVisible == True then
                viewSeasons show.lastEpisodeWatched seasons visibleSeasons
               else
                div [] []
              )
            ]


episodeWatched ( watchedSeason, watchedEpisode ) episode =
    if episode.season < watchedSeason then
        True
    else if (episode.season == watchedSeason) && (episode.number <= watchedEpisode) then
        True
    else
        False


hasSeasonBeenWatched lastWatchedEpisode season =
    case season.episodes of
        [] ->
            False

        latest :: _ ->
            episodeWatched lastWatchedEpisode latest


viewEpisode lastEpisodeWatched episode =
    div []
        [ div [ class "mdl-typography--title" ]
            [ text ("Episode " ++ (toString episode.number) ++ " - " ++ episode.name) ]
        , div [ class "elmtv__episode-desc" ]
            [ (Markdown.toHtml [] episode.summary) ]
        , div [ style [ ( "display", "flex" ), ( "justify-content", "flex-end" ) ] ]
            [ button [ onClick (MarkEpisodeWatched ( episode.season, episode.number )), disabled (episodeWatched lastEpisodeWatched episode), class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored elmtv__button--spacing" ]
                [ text "I watched this" ]
            ]
        ]


viewEpisodes lastEpisodeWatched isVisible season =
    case isVisible of
        True ->
            div []
                (List.map (viewEpisode lastEpisodeWatched) season.episodes)

        False ->
            div [] []


viewSeason lastEpisodeWatched visibleSeasons season =
    let
        isVisible =
            case Dict.get season.number visibleSeasons of
                Nothing ->
                    False

                Just visible ->
                    visible
    in
        div []
            [ div [ style [ ( "display", "flex" ), ( "justify-content", "space-between" ), ( "flex-wrap", "wrap" ) ] ]
                [ div [ class "mdl-typography--headline", style [ ( "line-height", "43px" ), ( "width", "50%" ) ] ]
                    [ text ("Season " ++ (toString season.number)) ]
                , div []
                    [ div []
                        [ (if (hasSeasonBeenWatched lastEpisodeWatched season) == True then
                            div [] []
                           else
                            (button [ onClick (MarkSeasonWatched season.number), class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored elmtv__button--spacing" ]
                                [ text "I watched this" ]
                            )
                          )
                        ]
                    , div [ style [ ( "text-align", "right" ) ] ]
                        [ button [ onClick (ToggleSeason season.number (not isVisible)), class "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent elmtv__button--spacing" ]
                            [ text
                                (if isVisible then
                                    "Hide episodes"
                                 else
                                    "Show episodes"
                                )
                            ]
                        ]
                    ]
                ]
            , viewEpisodes lastEpisodeWatched isVisible season
            , hr [] []
            ]


viewSeasons lastEpisodeWatched seasons visibleSeasons =
    div []
        ((hr [] [])
            :: (List.map (viewSeason lastEpisodeWatched visibleSeasons) seasons)
        )


episodeAired today episode =
    case Result.toMaybe (Date.fromString episode.airstamp) of
        Nothing ->
            True

        Just date ->
            is After today date


airedSeasons today seasons =
    seasons
        |> List.map (\season -> { season | episodes = (List.filter (episodeAired today) season.episodes) })
        |> List.filter (\season -> season.episodes /= [])
