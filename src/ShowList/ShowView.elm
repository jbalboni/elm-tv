module ShowList.ShowView exposing (view, viewUnwatched)

import Html exposing (Html, button, div, text, img, a, hr, span)
import Html.Attributes exposing (class, style, src, href, disabled)
import Html.Events exposing (onClick)
import Dict
import Markdown
import Date exposing (Date)
import ShowList.Types exposing (Msg(..), Show)
import Regex exposing (regex)
import Utils.Show exposing (getAiredSeasons, hasSeasonBeenWatched, episodeWatched, getNextEpisode)


viewUnwatched : Date -> Show -> Html Msg
viewUnwatched today { showData } =
    let
        nextEpisode =
            getNextEpisode showData
    in
        div [ class "elmtv__show" ]
            [ div [ class "elmtv__show-content" ]
                [ img [ class "elmtv__show-image elmtv__show-image--small", src (getImage showData.image) ]
                    []
                , div [ class "elmtv__show-desc" ]
                    [ div [ class "elmtv__show-headline" ]
                        [ text showData.name ]
                    , div []
                        [ case nextEpisode of
                            Nothing ->
                                text "All caught up"

                            Just episode ->
                                div []
                                    [ div [] [ text "Next episode: " ]
                                    , text ("Season " ++ (toString episode.season) ++ ", episode " ++ (toString episode.number) ++ ": " ++ episode.name)
                                    , div []
                                        [ button
                                            [ onClick (MarkEpisodeWatched showData.id ( episode.season, episode.number ))
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
                        ]
                    ]
                ]
            ]


view : Date -> Show -> Html Msg
view today { showData, visibleSeasons, seasonsListVisible } =
    let
        seasons =
            getAiredSeasons today showData.seasons

        episodes =
            List.concat (List.map (\season -> season.episodes) seasons)

        numEpisodes =
            List.length episodes

        unwatchedEpisodes =
            case showData.lastEpisodeWatched of
                ( 0, 0 ) ->
                    numEpisodes

                _ ->
                    List.length
                        (List.filter
                            (\episode ->
                                not (episodeWatched showData.lastEpisodeWatched (Just episode))
                            )
                            episodes
                        )

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
                    (RemoveShow { id = showData.id, rev = showData.rev, name = showData.name })
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
                [ img [ class "elmtv__show-image", src (getImage showData.image) ]
                    []
                , div [ class "elmtv__show-desc" ]
                    [ div [ class "elmtv__show-headline" ]
                        [ text showData.name ]
                    , div [ class "mdl-typography--title" ]
                        [ text
                            (if (numEpisodes > 0) then
                                unwatchedEpisodesDesc
                             else
                                ""
                            )
                        ]
                    , button
                        [ onClick (ToggleSeasons showData.id (not seasonsListVisible))
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
                            [ onClick (MarkAllEpisodesWatched showData.id)
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
                viewSeasons showData.id showData.lastEpisodeWatched seasons visibleSeasons
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


viewEpisode showId lastEpisodeWatched episode =
    div []
        [ div [ class "mdl-typography--title" ]
            [ text ("Episode " ++ (toString episode.number) ++ " - " ++ episode.name) ]
        , div [ class "elmtv__episode-desc" ]
            [ (Markdown.toHtml [] episode.summary) ]
        , div [ class "elmtv__episode-watched" ]
            [ button
                [ onClick (MarkEpisodeWatched showId ( episode.season, episode.number ))
                , disabled (episodeWatched lastEpisodeWatched (Just episode))
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
