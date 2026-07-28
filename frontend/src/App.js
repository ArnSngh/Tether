import "./App.css";
import HomePage from "./Pages/HomePage.js";
import { Route } from "react-router-dom";
import ChatPage from "./Pages/ChatPage.js";

function App() {
  return (
    <div className="App">
      <Route path="/" component={HomePage} exact />
      <Route path="/chats" component={ChatPage} />
    </div>
  );
}

export default App;
