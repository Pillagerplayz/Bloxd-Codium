#include <string>
#include <vector>

class CmdParser {
    public:
        CmdParser(std::string command) : command(command) {};
        void parse();
        std::vector<std::string> getArgs() const;
        std::string getAction() const;
    private:
        std::string command;
        std::string action;
        std::vector<std::string> args;
};