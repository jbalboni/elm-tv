module ShowList.ShowView exposing (view)

import Html exposing (Html, button, div, text, img, a, hr, span)
import Html.Attributes exposing (class, style, src, href, disabled)
import Html.Events exposing (onClick)
import Dict
import Markdown
import Date exposing (Date)
import Date.Extra.Compare as Compare exposing (is, Compare2(..))
import ShowList.Types exposing (Msg(..), ShowModel)
import Regex exposing (regex)


view : Date -> ShowModel -> Html Msg
view today { show, visibleSeasons, seasonsListVisible } =
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
                    List.length
                        (List.filter
                            (\episode ->
                                not (episodeWatched show.lastEpisodeWatched episode))
                        episodes)

        unwatchedEpisodesDesc =
            case unwatchedEpisodes of
                0 ->
                    "All caught up"

                1 ->
                    (toString unwatchedEpisodes) ++ " episode to watch"

                _ ->
                    (toString unwatchedEpisodes) ++ " episodes to watch"
    in
        div [ class "elmtv__show" ]
            [ button
                [ onClick
                    (RemoveShow { id = show.id, rev = show.rev, name = show.name })
                , class """
                    mdl-button
                    mdl-js-button
                    mdl-button--icon
                    mdl-button--accent
                    elmtv__remove-show"""
                ]
                [ span [ class "material-icons" ]
                    [ text "delete" ]
                ]
            , div [ class "elmtv__show-content" ]
                [ img [ class "elmtv__show-image", src (getImage show.image) ]
                    []
                , div [ class "elmtv__show-desc" ]
                    [ div [ class "elmtv__show-headline" ]
                        [ text show.name ]
                    , div [ class "mdl-typography--title" ]
                        [ text
                            (if (numEpisodes > 0) then
                                unwatchedEpisodesDesc
                             else
                                ""
                            )
                        ]
                    , button
                        [ onClick (ToggleSeasons show.id (not seasonsListVisible))
                        , class """
                            mdl-button
                            mdl-js-button
                            mdl-button--flat
                            mdl-js-ripple-effect
                            mdl-button--colored
                            elmtv__button--spacing"""
                        ]
                        [ text
                            (if seasonsListVisible then
                                "Hide seasons"
                             else
                                "Show seasons"
                            )
                        ]
                    , (if unwatchedEpisodes /= 0 then
                        button
                            [ onClick (MarkAllEpisodesWatched show.id)
                            , class """
                                mdl-button
                                mdl-js-button
                                mdl-button--flat
                                mdl-js-ripple-effect
                                mdl-button--accent
                                elmtv__button--spacing"""
                            ]
                            [ text "I'm caught up" ]
                       else
                        div [] []
                      )
                    ]
                ]
            , (if seasonsListVisible == True then
                viewSeasons show.id show.lastEpisodeWatched seasons visibleSeasons
               else
                div [] []
              )
            ]


getImage image =
    case image of
        Nothing ->
            "http://lorempixel.com/72/100/abstract"

        Just img ->
            Regex.replace Regex.All (regex "http") (\_ -> "https") img


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


viewEpisode showId lastEpisodeWatched episode =
    div []
        [ div [ class "mdl-typography--title" ]
            [ text ("Episode " ++ (toString episode.number) ++ " - " ++ episode.name) ]
        , div [ class "elmtv__episode-desc" ]
            [ (Markdown.toHtml [] episode.summary) ]
        , div [ class "elmtv__episode-watched" ]
            [ button
                [ onClick (MarkEpisodeWatched showId ( episode.season, episode.number ))
                , disabled (episodeWatched lastEpisodeWatched episode)
                , class """
                    mdl-button
                    mdl-js-button
                    mdl-button--raised
                    mdl-js-ripple-effect
                    mdl-button--colored
                    elmtv__button--spacing"""
                ]
                [ text "I watched this" ]
            ]
        ]


viewEpisodes showId lastEpisodeWatched isVisible season =
    case isVisible of
        True ->
            div []
                (List.map (viewEpisode showId lastEpisodeWatched) season.episodes)

        False ->
            div [] []


viewSeason showId lastEpisodeWatched visibleSeasons season =
    let
        isVisible =
            case Dict.get season.number visibleSeasons of
                Nothing ->
                    False

                Just visible ->
                    visible
    in
        div []
            [ div [ class "elmtv__season-content" ]
                [ div [ class "elmtv__season-title" ]
                    [ text ("Season " ++ (toString season.number)) ]
                , div []
                    [ div []
                        [ (if (hasSeasonBeenWatched lastEpisodeWatched season) == True then
                            div [] []
                           else
                            (button
                                [ onClick (MarkSeasonWatched showId season.number)
                                , class """
                                    mdl-button
                                    mdl-js-button
                                    mdl-button--raised
                                    mdl-js-ripple-effect
                                    mdl-button--colored
                                    elmtv__button--spacing"""
                                ]
                                [ text "I watched this" ]
                            )
                          )
                        ]
                    , div [ class "elmtv__episodes-toggle" ]
                        [ button
                            [ onClick (ToggleSeason showId season.number (not isVisible))
                            , class """
                                mdl-button
                                mdl-js-button
                                mdl-button--raised
                                mdl-js-ripple-effect
                                mdl-button--accent
                                elmtv__button--spacing"""
                            ]
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
            , viewEpisodes showId lastEpisodeWatched isVisible season
            , hr [] []
            ]


viewSeasons showId lastEpisodeWatched seasons visibleSeasons =
    div []
        ((hr [] [])
            :: (List.map (viewSeason showId lastEpisodeWatched visibleSeasons) seasons)
        )


episodeAired today episode =
    case Result.toMaybe (Date.fromString episode.airstamp) of
        Nothing ->
            True

        Just date ->
            is After today date


airedSeasons today seasons =
    seasons
        |> List.map (\season -> { season | episodes =
            (List.filter (episodeAired today) season.episodes) })
        |> List.filter (\season -> season.episodes /= [])
