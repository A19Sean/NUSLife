import React, { Component } from "react";
import "./App.css";
import "./SearchBar.js";
import SearchBar from "./SearchBar.js";
const axios = require("axios");

// DONE
// Added condition that prereqs have to be chronological in addMod()
// Display years chronologically in makePlan()
// Added overflow functionality in addMod(), added checkbox in SearchBar component
// Autoupdating of years in generateYears()

// TODO
// Check for basic requirements, mod mapping
// Other programmes besides mods eg SEP, UTCP
// Some bugs in the ParsedPrerequisite Tree: Should be "or" but instead it's "and" eg: MA1521, MA1102R
// Bug: Mods that are not explicitly stated as prereqs but are preclusions do not function as prereqs
// Keyboard shortcuts
// Tags and sharing

class App extends Component {
  constructor() {
    super();
    this.state = {
      mod: "",
      result: undefined, // state of search result
      preReqTree: {}, // contains preReqTree obj
      history: [], // contains history of searched modules
      yourmods: {}, // contains scheduled modules
      mcs: 0,
      overload: false,
      error: ""
    };
  }

  // Gets rid of unwanted object properties
  filterObjProps = (blacklist, obj) => {
    if (typeof obj === "object") {
      // Makes a copy of the object and modifies it
      const temp = JSON.parse(JSON.stringify(obj));
      blacklist.map(prop => delete temp[prop]);
      return temp;
    } else {
      return obj;
    }
  };

  makeButton = (key, click, text) => (
    <button key={key} onClick={click}>
      {text}
    </button>
  );

  formatYear = year => {
    return year.replace("/", "-");
  };

  buildTreeButton = key => {
    if (key === "Prerequisites")
      return (
        <React.Fragment>
          <br />
          {this.makeButton(
            key,
            () =>
              this.buildPreReqTree(this.formatYear(this.state.result.AcadYear)),
            "Prerequisite Tree"
          )}
        </React.Fragment>
      );
  };

  makeTable = (key, fn) => (
    <table key={key}>
      <tbody>
        <tr>
          <td>
            {key}
            {this.buildTreeButton(key)}
          </td>
          <td>{fn}</td>
        </tr>
      </tbody>
    </table>
  );

  // Converts object to html
  convertObj = obj => {
    if (typeof obj !== "object") {
      return obj;
    } else if (obj.constructor === Array) {
      return obj.map(elem => {
        return this.convertObj(elem);
      });
    } else {
      return Object.keys(obj).map(key =>
        this.makeTable(key, this.convertObj(obj[key]))
      );
    }
  };

  // Converts a plan object into html
  makePlan = (obj, props) => {
    if (obj.constructor === Array) {
      return obj.map(elem =>
        this.makeButton(
          elem.name,
          () => this.delMod(elem.name, elem.mcs, props[1], props[0]),
          elem.name
        )
      );
    } else {
      // Sorts years(keys) in chronological/lexical order before rendering
      return Object.keys(obj)
        .sort((a, b) => a <= b)
        .map(key =>
          this.makeTable(key, this.makePlan(obj[key], props.concat([key])))
        );
    }
  };

  searchMods = mod => {
    this.setState({
      mod: mod
    });
  };

  // Parses boolTree objs to return a html tree
  modMavenTree = obj => {
    if (obj === undefined || obj === "") {
      return;
    }
    if (typeof obj !== "object") {
      return this.makeButton(obj, () => this.searchMods(obj), obj);
    }
    if (obj.constructor === Array) {
      return obj.map(mod => this.modMavenTree(mod));
    }
    const isMod = key =>
      [
        "Prerequisite Tree",
        "Either of",
        "All of",
        "Preclusions",
        "Prerequisites",
        "Needed by",
        "Only"
      ].indexOf(key) === -1;
    const replace = key => {
      if (key === "or") return "Any of";
      if (key === "and") return "All of";
      if (isMod(key))
        return this.makeButton(key, () => this.searchMods(key), key);
      return key;
    };
    return Object.keys(obj).map(key =>
      this.makeTable(replace(key), this.modMavenTree(obj[key]))
    );
  };

  // Builds entire prereq tree and updates state
  buildPreReqTree = year => {
    if (this.state.result === undefined) return;
    const mod = this.state.result.ModuleCode;
    const getPrereqs = mod => {
      if (mod === undefined) {
        return undefined;
      }

      const url = `https://api.nusmods.com/${year}/modules/${mod}.json`;

      return axios
        .get(url)
        .then(response => response.data.ParsedPrerequisite)
        .catch(error => {
          console.log(error);
          return undefined;
        });
    };

    const buildTree = node => {
      if (typeof node === "object") {
        // If node is a boolTree
        return Promise.all(
          Object.keys(node).map(boolOp =>
            buildTree(node[boolOp]).then(treeArray => {
              // An array of preReqTrees
              node[boolOp] = treeArray;
            })
          )
        ).then(result => node);
      } else if (node.constructor === Array) {
        // If node is an array of mods
        return Promise.all(node.map(buildTree));
      } else {
        // If node is a single mod
        return getPrereqs(node).then(boolTree => {
          if (boolTree === undefined) {
            // If mod has no prerequisites (Either mod does not exist or it is a foundational mod)
            return node;
          } else {
            if (typeof boolTree === "object") {
              return buildTree(boolTree).then(result => ({ [node]: result }));
            } else {
              // If there is only one prerequisite
              return buildTree(boolTree).then(result => ({
                [node]: { Only: result }
              }));
            }
          }
        });
      }
    };

    buildTree(mod).then(result => {
      const temp = { "Prerequisite Tree": result };
      this.setState({
        preReqTree: temp
      });
    });
  };

  addMod = (mod, sem, year) => {
    const getCurrMods = (sem = "Sem 2", maxYear = "9999-9999") => {
      const getModsInYear = year => {
        if (year < maxYear || (year === maxYear && sem === "Sem 2")) {
          const first = this.state.yourmods[year]["Sem 1"].map(mod => mod.name);
          const second = this.state.yourmods[year]["Sem 2"].map(
            mod => mod.name
          );
          return first.concat(second);
        } else if (year === maxYear && sem === "Sem 1") {
          return this.state.yourmods[year]["Sem 1"].map(mod => mod.name);
        } else {
          return [];
        }
      };

      const currmods = Object.keys(this.state.yourmods)
        .map(getModsInYear)
        .reduce((acc, arr) => acc.concat(arr), []);

      return currmods;
    };

    // Parses boolTree objs to return a bool value(prerequisites, preclusions)
    const parseBoolTree = (obj, currmods) => {
      if (typeof obj !== "object") {
        return currmods.indexOf(obj) >= 0;
      } else {
        const or =
          obj.or == null
            ? true
            : obj.or.reduce(
                (acc, elem) => acc || parseBoolTree(elem, currmods),
                false
              );
        const and =
          obj.and == null
            ? true
            : obj.and.reduce(
                (acc, elem) => acc && parseBoolTree(elem, currmods),
                true
              );
        return or && and;
      }
    };

    const checkPreclusion = currmods => {
      if (
        this.state.result === undefined ||
        this.state.result.ParsedPreclusion === undefined
      )
        return false;
      else return parseBoolTree(this.state.result.ParsedPreclusion, currmods);
    };

    const checkPrereqs = currmods => {
      if (
        this.state.result === undefined ||
        this.state.result.ParsedPrerequisite === undefined
      )
        return true;
      else return parseBoolTree(this.state.result.ParsedPrerequisite, currmods);
    };

    const checkDuplicates = currmods => {
      return currmods.find(currmod => currmod === mod) !== undefined;
    };

    const checkOverload = () => {
      if (this.state.yourmods[year] === undefined) {
        return 0;
      } else {
        const mild = 24;
        const overload = 32;
        const total = this.state.yourmods[year][sem]
          .map(mod => parseInt(mod.mcs))
          .reduce((acc, mcs) => acc + mcs, 0);
        return total >= overload ? 2 : total >= mild ? 1 : 0;
      }
    };

    const temp = JSON.parse(JSON.stringify(this.state.yourmods));
    if (checkDuplicates(getCurrMods())) {
      this.updateError("No duplicates");
      return undefined;
    } else if (checkPreclusion(getCurrMods())) {
      this.updateError("Already precluded");
      return undefined;
    } else if (!checkPrereqs(getCurrMods(sem, year))) {
      this.updateError("Lack prerequisites");
      return undefined;
    } else if (checkOverload() > 0) {
      const value = checkOverload();
      // Overflows mod
      if (value === 2 && !this.state.overload) {
        this.updateError(
          "You are unable to overload without applying for permission"
        );
        // Increments year, sem
        const yearInt = parseInt(year.slice(0, 4));
        year = sem === "Sem 1" ? year : yearInt + 1 + "-" + (yearInt + 2);
        sem = sem === "Sem 1" ? "Sem 2" : "Sem 1";
      } else if (value === 1) {
        this.updateError("Taking on a challenge are we?");
      }
    }

    if (this.state.result !== undefined) {
      if (temp[year] === undefined) {
        temp[year] = { "Sem 1": [], "Sem 2": [] };
      }
      temp[year][sem] = temp[year][sem].concat([
        { name: mod, mcs: this.state.result.ModuleCredit }
      ]);
    }

    // Updates yourmods, mcs
    // Clears error?s
    const newMcs =
      this.state.result === undefined
        ? 0
        : parseInt(this.state.result.ModuleCredit);
    this.setState(state => ({
      yourmods: temp,
      mcs: state.mcs + newMcs
      // error: ""
    }));
  };

  delMod = (mod, mcs, sem, year) => {
    const temp = JSON.parse(JSON.stringify(this.state.yourmods));
    temp[year][sem] = temp[year][sem].filter(elem => elem.name !== mod);
    this.setState((state, props) => ({
      yourmods: temp,
      mcs: state.mcs - mcs
    }));
  };

  updateResult = result => {
    this.setState(state => ({
      result: result
    }));
  };

  updateHistory = mod => {
    this.setState(state => ({
      history: [mod].concat(state.history).slice(0, 10)
    }));
  };

  updateOverload = () => {
    this.setState(state => ({
      overload: !state.overload
    }));
  };

  updateError = error => {
    this.setState({ error: error });
  };

  handleKeyInput = event => {
    console.log(event.key);
  };

  render() {
    const unwantedProps = [
      "LockedModules",
      "ParsedPreclusion",
      "ParsedPrerequisite",
      "ModmavenTree",
      "History",
      "Timetable",
      "LecturePeriods",
      "TutorialPeriods",
      "CorsBiddingStats",
      "Workload"
    ];
    const mmTree =
      this.state.result !== undefined
        ? {
            Preclusions: this.state.result.ParsedPreclusion,
            Prerequisites: this.state.result.ParsedPrerequisite,
            "Needed by": this.state.result.LockedModules
          }
        : "";
    return (
      <div className="App" onKeyDown={this.handleKeyInput}>
        <div>
          Your Mods:
          {this.makePlan(this.state.yourmods, [])} <br />
          Your MCs: {this.state.mcs}
          <br />
        </div>
        <div>
          <SearchBar
            addMod={this.addMod}
            updateResult={this.updateResult}
            updateHistory={this.updateHistory}
            updateError={this.updateError}
            updateOverload={this.updateOverload}
            year={this.state.year}
            mod={this.state.mod}
            overload={this.state.overload}
            error={this.state.error}
          />
          {this.convertObj(
            this.filterObjProps(unwantedProps, this.state.result)
          )}
          {this.modMavenTree(mmTree)}
          {this.modMavenTree(this.state.preReqTree)}
        </div>
        <div>
          History:
          {this.state.history.map((result, index) => (
            <p key={index} onClick={() => this.searchMods(result)}>
              {result}
            </p>
          ))}
        </div>
      </div>
    );
  }
}

export default App;
