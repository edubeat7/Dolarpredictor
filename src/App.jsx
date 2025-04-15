import { useState, useEffect  } from 'react'
import './App.css'
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter as Router, Route, Switch  } from "react-router-dom";
import Predictor from "./Component/Predictor/Predictor";


function App() {

  
  return (
    <div className="container">
    <Router>
     <Switch>
        <Route exact path="/">
          <Predictor />
        </Route>
        <Route exact path="/Predictor">
          <Predictor />
        </Route>
     </Switch>
     </Router>
    </div>
  )
}

export default App
