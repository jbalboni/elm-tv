port module Login.Login exposing (..)

import Html exposing (Html, button, div, text, input, label, span, a, header, main', nav, img)
import Html.Attributes exposing (type', class, placeholder, href, style, src)
import Html.Events exposing (onClick)


-- MODEL


type alias Model =
    { loggedIn : Bool, picture : String, email : String }


model =
    { loggedIn = False, picture = "", email = "" }



-- UPDATE


port logInUser : Bool -> Cmd msg


port logOutUser : Bool -> Cmd msg


port loggedInState : (Model -> msg) -> Sub msg


subscriptions : Model -> Sub Msg
subscriptions model =
    loggedInState SetLoggedIn


type Msg
    = SetLoggedIn Model
    | LogInUser
    | LogOutUser


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        LogInUser ->
            ( model, logInUser True )

        SetLoggedIn logIn ->
            ( logIn, Cmd.none )

        LogOutUser ->
            ( model, logOutUser True )



-- view


viewLoggedIn model =
    nav [ class "mdl-navigation" ]
        [ a [ class "mdl-navigation__link", href "#", onClick LogOutUser ]
            [ text "Sign out" ]
        , img [ src model.picture, class "elmtv__profile-picture" ]
            []
        ]


viewLoggedOut =
    nav [ class "mdl-navigation" ]
        [ a [ class "mdl-navigation__link", href "#", onClick LogInUser ]
            [ text "Sign in" ]
        ]


view : Model -> Html Msg
view model =
    case model.loggedIn of
        True ->
            viewLoggedIn model

        False ->
            viewLoggedOut
