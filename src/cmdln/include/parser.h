#include <string>
#include <vector>

class CmdParser {
    public:
        CmdParser(std::string command) : command(command) {};
        void parse();
        std::vector<std::string> getArgs() const;
    private:
        std::string command;
        std::vector<std::string> args;
};