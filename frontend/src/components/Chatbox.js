import { Box } from "@chakra-ui/layout";
import "./styles.css";
import SingleChat from "./SingleChat.js";
import { ChatState } from "../Context/ChatProvider.js";

const Chatbox = ({ fetchAgain, setFetchAgain, onOpenSearch }) => {
  const { selectedChat } = ChatState();

  return (
    <Box
      d={{ base: selectedChat ? "flex" : "none", md: "flex" }}
      alignItems="center"
      flexDir="column"
      p={3}
      bg="rgba(251, 251, 250, 0.72)"
      backdropFilter="blur(10px)"
      w={{ base: "100%", md: "auto" }}
      flex={{ md: 1 }}
      minW={0}
      borderRadius="8px"
      borderWidth="1px"
      borderColor="#d9dfe4"
      boxShadow="0 8px 28px rgba(30, 55, 46, 0.06)"
    >
      <SingleChat
        fetchAgain={fetchAgain}
        setFetchAgain={setFetchAgain}
        onOpenSearch={onOpenSearch}
      />
    </Box>
  );
};

export default Chatbox;
