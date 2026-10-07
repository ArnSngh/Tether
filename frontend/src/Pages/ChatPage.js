import { Box } from "@chakra-ui/layout";
import { useState } from "react";
import Chatbox from "../components/Chatbox.js";
import MyChats from "../components/MyChats.js";
import SideDrawer from "../components/miscellaneous/SideDrawer.js";
import { ChatState } from "../Context/ChatProvider.js";
import "../App.css";

const Chatpage = () => {
  const [fetchAgain, setFetchAgain] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user } = ChatState();

  return (
    <div className="chat-page">
      {user && (
        <SideDrawer
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
        />
      )}
      <Box
        className="chat-page__body"
        d="flex"
        justifyContent="space-between"
        p="14px"
      >
        {user && <MyChats fetchAgain={fetchAgain} />}
        {user && (
          <Chatbox
            fetchAgain={fetchAgain}
            setFetchAgain={setFetchAgain}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        )}
      </Box>
    </div>
  );
};

export default Chatpage;
