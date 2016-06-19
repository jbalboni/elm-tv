port module ShowList.State exposing (model, update, subscriptions)

import Http
import Show.Types as ShowTypes
import GlobalPorts exposing (showNotification)
import ShowList.Types exposing (Model, Msg(..), ShowRev)
import Show.State as ShowState
import Show.Types as ShowTypes exposing (Msg(UpdateShow, ShowError, SetRev, RemoveShow))
import Date.Extra.Format as Format exposing (utcIsoString)


model =
    { list = [], error = Nothing }


port loadShows : (List ShowTypes.Show -> msg) -> Sub msg


port loadRev : (ShowRev -> msg) -> Sub msg


port removeShow : ShowTypes.ShowRemoval -> Cmd msg


subscriptions : Model -> Sub ShowList.Types.Msg
subscriptions model =
    Sub.batch
        [ loadShows LoadShows
        , loadRev LoadRev
        ]


updateHelp : Int -> ShowTypes.Msg -> ShowTypes.Model -> ( ShowTypes.Model, Cmd ShowList.Types.Msg )
updateHelp id msg show =
    if show.show.id /= id then
        ( show, Cmd.none )
    else
        let
            ( newShow, cmds ) =
                ShowState.update msg show
        in
            ( newShow
            , Cmd.map (ShowMsg id) cmds
            )


updateAll show =
    let
        ( defaultShowModel, initCmd ) =
            ShowState.init

        ( newShow, cmd ) =
            ShowState.update UpdateShow { defaultShowModel | show = show }
    in
        ( newShow
        , Cmd.batch [ Cmd.map (ShowMsg show.id) initCmd, Cmd.map (ShowMsg show.id) cmd ]
        )


update : ShowList.Types.Msg -> Model -> ( Model, Cmd ShowList.Types.Msg )
update msg model =
    case msg of
        ShowMsg id subMsg ->
            case subMsg of
                RemoveShow removal ->
                    let
                        listWithoutShow =
                            List.filter (\show -> removal.id /= show.show.id) model.list
                    in
                        ( { model | list = listWithoutShow }, Cmd.batch [ removeShow removal, showNotification ("Removed " ++ removal.name) ] )

                ShowError error ->
                    case error of
                        Http.UnexpectedPayload err ->
                            ( { model | error = Just err }, Cmd.none )

                        _ ->
                            ( { model | error = Just "Sorry, something went wrong during your search. You might be offline." }, Cmd.none )

                _ ->
                    let
                        ( newShows, cmds ) =
                            List.unzip (List.map (updateHelp id subMsg) model.list)
                    in
                        ( { model | list = newShows }
                        , Cmd.batch cmds
                        )

        AddToList ( today, result ) ->
            let
                getImage show =
                    case show.image of
                        Nothing ->
                            Nothing

                        Just image ->
                            Just image.medium

                ( defaultShowModel, initialCmd ) =
                    ShowState.init

                defaultShow =
                    defaultShowModel.show

                updatedShow =
                    { defaultShow | id = result.show.id, name = result.show.name, image = (getImage result.show), added = utcIsoString today }

                ( newShow, cmds ) =
                    ShowState.update UpdateShow { defaultShowModel | show = updatedShow }

                newList =
                    newShow :: model.list
            in
                ( { model | list = newList }, Cmd.batch [ Cmd.map (ShowMsg newShow.show.id) initialCmd, Cmd.map (ShowMsg newShow.show.id) cmds, showNotification ("Added " ++ updatedShow.name) ] )

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
