import React, {PropTypes} from 'react';
import withStyles from 'universal/styles/withStyles';
import {css} from 'aphrodite';
import AgendaHeader from 'universal/modules/teamDashboard/components/AgendaHeader/AgendaHeader';
import AgendaListAndInputContainer from 'universal/modules/teamDashboard/containers/AgendaListAndInput/AgendaListAndInputContainer';

const TeamAgenda = (props) => {
  const {styles, teamId} = props;
  return (
    <div className={css(styles.root)}>
      <AgendaHeader/>
      <AgendaListAndInputContainer teamId={teamId}/>
    </div>
  );
};

TeamAgenda.propTypes = {
  children: PropTypes.any,
  styles: PropTypes.object,
  teamId: PropTypes.string,
};

const styleThunk = () => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    width: '100%'
  }
});

export default withStyles(styleThunk)(TeamAgenda);