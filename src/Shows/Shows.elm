port module Shows.Shows exposing (Model, Msg(AddToList), model, view, update, subscriptions)

import Html exposing (Html, div, hr, text)
import Html.Attributes exposing (style, class)
import Api.Types exposing (TVShowResult, TVShowEpisode)
import Http
import Html.App as App
import Show.Show as Show exposing (Msg(UpdateShow, ShowError, SetRev, RemoveShow), ShowRemoval)
import Date exposing (Date)
import Date.Extra.Format as Format exposing (utcIsoString)


-- Model


type alias Model =
    { list : List Show.Model, error : Maybe String }


type alias ShowAndEpisodes =
    ( Int, List TVShowEpisode )


type alias ShowRev =
    { id : Int, rev : String }


model =
    { list = [], error = Nothing }



-- Update


port loadShows : (List Show.Show -> msg) -> Sub msg


port loadRev : (ShowRev -> msg) -> Sub msg


port removeShow : Show.ShowRemoval -> Cmd msg


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ loadShows LoadShows
        , loadRev LoadRev
        ]


type Msg
    = AddToList (Date, TVShowResult)
    | LoadShows (List Show.Show)
    | ShowMsg Int Show.Msg
    | LoadRev ShowRev


updateHelp : Int -> Show.Msg -> Show.Model -> ( Show.Model, Cmd Msg )
updateHelp id msg show =
    if show.show.id /= id then
        ( show, Cmd.none )
    else
        let
            ( newShow, cmds ) =
                Show.update msg show
        in
            ( newShow
            , Cmd.map (ShowMsg id) cmds
            )


updateAll show =
    let
        ( defaultShowModel, initCmd ) =
            Show.model

        ( newShow, cmd ) =
            Show.update UpdateShow { defaultShowModel | show = show }
    in
        ( newShow
        , Cmd.batch [ Cmd.map (ShowMsg show.id) initCmd, Cmd.map (ShowMsg show.id) cmd ]
        )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ShowMsg id subMsg ->
            case subMsg of
                RemoveShow removal ->
                    let
                        listWithoutShow =
                            List.filter (\show -> removal.id /= show.show.id) model.list
                    in
                        ( { model | list = listWithoutShow}, removeShow removal)

                ShowError error ->
                    case error of
                        Http.UnexpectedPayload err ->
                            ( { model | error = Just err }, Cmd.none )

                        _ ->
                            ( { model | error = Just "Something terrible has happened" }, Cmd.none )

                _ ->
                    let
                        ( newShows, cmds ) =
                            List.unzip (List.map (updateHelp id subMsg) model.list)
                    in
                        ( { model | list = newShows }
                        , Cmd.batch cmds
                        )

        AddToList (today, result) ->
            let
                getImage show =
                    case show.image of
                        Nothing ->
                            Nothing

                        Just image ->
                            Just image.medium

                ( defaultShowModel, initialCmd ) =
                    Show.model

                defaultShow =
                    defaultShowModel.show

                updatedShow =
                    { defaultShow | id = result.show.id, name = result.show.name, image = (getImage result.show), added = utcIsoString today }

                ( newShow, cmds ) =
                    Show.update UpdateShow { defaultShowModel | show = updatedShow }

                newList =
                    newShow :: model.list
            in
                ( { model | list = newList }, Cmd.batch [ Cmd.map (ShowMsg newShow.show.id) initialCmd, Cmd.map (ShowMsg newShow.show.id) cmds ] )

        LoadShows shows ->
            let
                ( updatedShows, cmds ) =
                    List.unzip (List.map (updateAll) shows)
            in
                ( { model | list = updatedShows }, Cmd.batch cmds )

        LoadRev rev ->
            let
                ( newShows, cmds ) =
                    List.unzip (List.map (updateHelp rev.id (SetRev rev.rev)) model.list)
            in
                ( { model | list = newShows }, Cmd.batch cmds )



-- View


view : Model -> Html Msg
view model =
    case model.list of
        [] ->
            div [] []

        xs ->
            div [ class "elmtv__panel mdl-shadow--2dp" ]
                ((List.map (\show -> App.map (ShowMsg show.show.id) (Show.view show)) xs)
                    |> (List.intersperse (hr [] []))
                )
