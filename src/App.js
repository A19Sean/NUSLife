import React, { Component } from 'react';
import './App.css';
const axios = require('axios');

// Check for prereqs, preclusion, mcs, basic requirements

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {value: '',
                  sem: '1',
                  modules: [],
                  info: {},
                  yourmods: [],
                  mcs: 180,
                  autocomplete: [],
                  error: ""
                };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(event) {
    if(event.target.type === "radio") {
        this.setState({sem: event.target.value});
    } else {
        this.setState((state, props) => ({
        yourmods: state.yourmods.concat([{
          year: 2018,
          sem: state.sem,
          mod: state.info.ModuleCode
        }]),
        mcs: state.mcs - parseInt(state.info.ModuleCredit)
      }));
      console.log(this.state.yourmods);
    }
  }

  handleChange(event) {
    const value = event.target.value;
    const modcodes = this.state.modules.map(mod => mod["ModuleCode"]);
    const results = (value === "") ? [] : modcodes.filter(mod => RegExp(value + '+').test(mod)).slice(0,10);
    this.setState({value: value,
                  autocomplete: results
                  });
  }

  handleSubmit(event) {
    const url = `https://api.nusmods.com/2018-2019/${this.state.sem}/modules/${this.state.value}.json`;
    axios.get(url)
    .then((response) => {
      this.setState({
        info: response.data
      });
      console.log(url);
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    event.preventDefault();
  }

  componentDidMount() {
    axios.get("https://api.nusmods.com/2018-2019/moduleList.json")
    .then((response) => {
      this.setState({
        modules: response.data
      })
    })
  }
  
  render() {
    // Converts from object literal to html syntax
    function convert(obj) {
      const blacklist = ["Timetable", "LecturePeriods", "TutorialPeriods", "CorsBiddingStats"];
      if(typeof obj !== "object") {
        return obj;
      } else if(obj.constructor === Array) {
        return obj.map(elem => <tr><td>{convert(elem)}</td></tr>);
      } else {
        const props = Object.keys(obj).filter(key => blacklist.indexOf(key) === -1);
        return props.map(key => <tr><td>{key}</td> <td>{convert(obj[key])}</td> </tr>);
      }
    }

    return (
      <div className="App">
        Your Mods: <tr><th>Year</th><th>Semester</th><th>Module</th></tr>
        {this.state.yourmods.map(mod => <tr><td>{mod.year}</td><td>{mod.sem}</td><td>{mod.mod}</td></tr>)} <br/>
        Your MCs: {this.state.mcs}<br/>
        <form onSubmit={this.handleSubmit} onChange={this.handleChange}>
          Module Code:
          <input type="text" name="name" />
          <input type="submit" value="Submit" />
          <button onClick={this.handleClick}>Add Module</button> <br/>
          Semester: 
          <input onClick={this.handleClick} type="radio" name="Semester" value="1"/> 1
          <input onClick={this.handleClick} type="radio" name="Semester" value="2"/> 2 <br/>
          
          {this.state.autocomplete.map(result => <p>{result}</p>)}
        </form>
        {convert(this.state.info)}
      </div>
    );
  }
}

export default App;
