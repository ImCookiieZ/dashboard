import './App.css';
// eslint-disable-next-line
import {BrowserRouter as Router, Navigate, Route, Routes} from "react-router-dom";
import LoginPage from "./pages/LoginPage"
import MainPage from "./pages/MainPage"
import {AuthProvider} from "./Auth"
import {RequireAuth} from "./components/RequireAuth";
import {WidgetProvider} from "./widgets/Widgets"


function App() {
  return (
      <>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path='/login' element={<LoginPage/>}/>
              <Route path='/'
                     element={
                       <RequireAuth>
                         <WidgetProvider>
                           <MainPage/>
                         </WidgetProvider>
                       </RequireAuth>
              }/>
              {/*<Route path="/home" element={
                <RequireAuth>
                  <MainPage/>
                </RequireAuth>
              }/>*/}
            </Routes>
          </Router>
        </AuthProvider>
      </>
  );
}

export default App;
