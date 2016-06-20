module Search.View exposing (view)

import Set exposing (Set)
import Html exposing (Html, button, div, text, input, label, span, img, hr, form)
import Html.Attributes exposing (type', class, placeholder, style, src, disabled, id, for)
import Html.Events exposing (onClick, onInput, onSubmit)
import Markdown

import Search.Types exposing (Model, Msg(..))

view : Model -> Set Int -> Html Msg
view model shows =
    if model.visible then
        (expandedView model shows)
    else
        collapsedView model


getImage image =
    let
        placeholder =
            { medium = "http://lorempixel.com/72/100/abstract" }
    in
        case image of
            Nothing ->
                placeholder.medium

            Just img ->
                img.medium


viewTVShowResult shows result =
    div []
        [ div [ class "elmtv__search-result" ]
            [ img [ class "elmtv__show-image", src (getImage result.show.image) ]
                []
            , div [ class "elmtv__show-desc" ]
                [ div [ class "mdl-typography--headline" ]
                    [ text result.show.name ]
                , div [ class "mdl-typography--title" ]
                    [ text
                        (case result.show.network of
                            Nothing ->
                                ""

                            Just network ->
                                network.name
                        )
                    ]
                , div []
                    [ Markdown.toHtml [] result.show.summary ]
                ]
            ]
        , div []
            [ (case (Set.member result.show.id shows) of
                False ->
                    button
                        [ onClick (StartAdd result)
                        , class """
                            mdl-button
                            mdl-js-button
                            mdl-button--raised
                            mdl-js-ripple-effect
                            mdl-button--colored"""
                        ]
                        [ text "Add" ]

                True ->
                    button
                        [ class """
                            mdl-button
                            mdl-js-button
                            mdl-button--raised
                            mdl-js-ripple-effect
                            mdl-button--colored"""
                        , disabled True ]
                        [ text "Already added" ]
              )
            ]
        ]


viewResults results shows =
    div [ class "elmtv__panel elmtv__search-results" ]
        ((List.map (viewTVShowResult shows) results)
            |> (List.intersperse (hr [] []))
        )


viewError error =
    div [ class "elmtv__panel" ]
        [ text (Maybe.withDefault "" error) ]


expandedView model shows =
    form [ onSubmit SearchShows ]
        [ div [ class "elmtv__search-content" ]
            [ div []
                [ div
                    [ class "mdl-textfield mdl-js-textfield mdl-textfield--floating-label" ]
                    [ input
                        [ type' "text"
                        , onInput UpdateTerm
                        , class "mdl-textfield__input"
                        , id "searchInput"
                        ]
                        []
                    , label [ class "mdl-textfield__label", for "searchInput" ]
                        [ text "Search for shows" ]
                    ]
                ]
            , button
                [ type' "submit"
                , class """
                    mdl-button
                    mdl-js-button
                    mdl-button--raised
                    mdl-js-ripple-effect
                    mdl-button--colored
                    elmtv__button--spacing"""
                ]
                [ text "Search" ]
            , button
                [ type' "button"
                , onClick HideSearch
                , class """
                    mdl-button
                    mdl-js-button
                    mdl-button--flat
                    mdl-button--accent"""
                ]
                [ text "Cancel" ]
            ]
        , if (List.length model.results) > 0 then
            viewResults model.results shows
          else if model.error /= Nothing then
            viewError model.error
          else
            div [] []
        ]


collapsedView model =
    div [ class "elmtv__search--collapsed" ]
        [ div [ style [ ( "float", "right" ) ] ]
            [ button
                [ class """
                    mdl-button
                    mdl-js-button
                    mdl-button--fab
                    mdl-js-ripple-effect
                    mdl-button--colored"""
                , onClick ShowSearch
                ]
                [ span [ class "material-icons" ]
                    [ text "add" ]
                ]
            ]
        ]
